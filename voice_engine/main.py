import os
import json
import asyncio
import jwt
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from loguru import logger
import traceback
from sqlmodel import Session
from shared.database import engine
from shared.models import Agent

# ── Startup validation ─────────────────────────────────────────────
_JWT_SECRET = os.environ.get("JWT_SECRET")
if not _JWT_SECRET:
    raise RuntimeError("JWT_SECRET env var is required — refusing to start without it")
# ────────────────────────────────────────────────────────────────

try:
    from voice_engine.bot import VoiceAgent
    from voice_engine.demo_session import run_demo_session
except Exception as e:
    print(f"CRITICAL STARTUP CRASH: {traceback.format_exc()}")
    raise
async def startup_event():
    from sqlalchemy import text
    from voice_engine.preload import warmup_models

    logger.info("=" * 60)
    logger.info("Voice engine startup — warming I/O pools (lazy ML load strategy)")
    logger.info("=" * 60)

    # ── 1. Lightweight model warmup (lazy strategy — no ML loaded here) ──
    try:
        await asyncio.to_thread(warmup_models)
    except Exception as e:
        logger.warning(f"Model warmup failed: {e}")

    # ── 2. Warm up database connection pool ──────────────────────────────
    def _warm_db():
        with Session(engine) as db:
            db.execute(text("SELECT 1"))

    try:
        await asyncio.to_thread(_warm_db)
        logger.info("✅ Database connection pool warmed up")
    except Exception as e:
        logger.warning(f"Failed to warm up DB: {e}")

    # ── 3. Warm up Redis connection (if configured) ──────────────────────
    try:
        from shared.cache import get_redis
        redis_client = get_redis()
        if redis_client:
            await redis_client.ping()
            logger.info("✅ Redis connection warmed up")
        else:
            logger.info("ℹ️  Redis not configured — KB cache layers disabled")
    except Exception as e:
        logger.warning(f"Failed to warm up Redis: {e}")

    # ── 4. Pre-synthesize demo greeting (DISABLED — demo removed from landing page) ──
    # Kept for reference; re-enable if the browser demo is brought back.
    # try:
    #     from voice_engine.demo_session import presynthesise_greeting
    #     await presynthesise_greeting()
    # except Exception as e:
    #     logger.warning(f"Demo greeting pre-synthesis failed (non-fatal): {e}")

    logger.info("=" * 60)
    logger.info("✅ Startup complete — idle RAM ~330MB, ready to handle calls")
    logger.info("=" * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup_event()
    yield


app = FastAPI(title="AIxcaller Voice Engine", lifespan=lifespan)

@app.websocket("/demo")
async def demo_endpoint(websocket: WebSocket):
    """
    Browser-based live demo WebSocket.
    No Telnyx. No auth token. Accepts raw webm/opus audio from browser MediaRecorder.
    2-minute session auto-enforced server-side.
    """
    await websocket.accept()
    logger.info("New browser demo session started.")
    try:
        await run_demo_session(websocket)
    except Exception as e:
        logger.error(f"Demo endpoint error: {e}", exc_info=True)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("Browser demo session closed.")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket handler for real-time audio streams from Telnyx.
    """
    await websocket.accept()
    logger.info("Connection accepted from Telnyx.")

    try:
        # Wait for Telnyx protocol handshake
        while True:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            msg = json.loads(raw)
            event = msg.get("event")

            if event == "connected":
                logger.info(f"Telnyx connected. Waiting for start event...")
                continue

            if event == "start":
                start_data = msg.get("start", {})
                # Per official Telnyx docs: stream ID is at root level as 'stream_id'
                # call_control_id is inside the 'start' object
                stream_id = msg.get("stream_id") or start_data.get("stream_id")
                call_control_id = start_data.get("call_control_id")
                call_session_id = start_data.get("call_session_id")
                
                logger.info(f"Root keys: {list(msg.keys())}")
                if start_data: logger.info(f"Start data keys: {list(start_data.keys())}")
                
                # custom_parameters is confirmed by logs as the correct key
                params = start_data.get("custom_parameters") or {}
                
                # Log media_format to verify Telnyx codec negotiation
                media_format = start_data.get("media_format", {})
                logger.info(f"Telnyx media_format: {media_format}")
                
                logger.info(f"Start event received. Available params: {list(params.keys())}")
                
                # 1. Verify the Security Token
                token = params.get("call_token")
                if not token:
                    logger.error("Missing call_token. Closing connection.")
                    await websocket.close()
                    return

                try:
                    decoded = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
                    
                    tenant_id = decoded["tenant_id"]
                    agent_id = decoded["agent_id"]
                    
                    # 2. Fetch full config from DB (since JWT is now minimal)
                    with Session(engine) as db:
                        from shared.models import Tenant
                        tenant = db.get(Tenant, uuid.UUID(tenant_id))
                        if not tenant:
                            logger.error(f"Tenant {tenant_id} not found in DB")
                            await websocket.close()
                            return
                            
                        is_demo = decoded.get("is_demo", False)

                        # ── Credit Gate ───────────────────────────────────────────────
                        # Exempt demo calls — the demo number is a system account with
                        # no paid plan; blocking it would break the demo experience.
                        if not is_demo:
                            minutes_used = tenant.minutes_used or 0.0
                            minutes_included = tenant.minutes_included or 0
                            # Only gate when the tenant actually has a plan (minutes_included > 0).
                            # A brand-new free account with minutes_included=0 would otherwise
                            # be blocked immediately, which is wrong.
                            if minutes_included > 0 and minutes_used >= minutes_included:
                                logger.warning(
                                    f"Tenant {tenant_id} out of minutes "
                                    f"({minutes_used:.1f}/{minutes_included}). Blocking call."
                                )
                                await websocket.close()
                                return
                        # ──────────────────────────────────────────────────────────────

                        agent = db.get(Agent, agent_id)
                        if not agent:
                            logger.error(f"Agent {agent_id} not found in DB")
                            await websocket.close()
                            return

                        _DEMO_SYSTEM_PROMPT = (
                            "You are Alex, an enthusiastic AI demo agent for AIxCaller — the AI voice calling platform. "
                            "This is a LIVE 1-MINUTE demo call. Show visitors exactly what AIxCaller can do.\n\n"
                            "WHAT YOU KNOW — answer these confidently:\n"
                            "- AIxCaller lets businesses deploy AI voice agents that answer inbound and outbound calls 24/7, no staff needed.\n"
                            "- PRICING: Starter $50/mo (200 min, 1 agent) · Pro $119/mo (500 min, 2 agents) · Premium $250/mo (1100 min, 4 agents). All plans include a free trial.\n"
                            "- SETUP: Takes under 5 minutes — pick a country, provision a real phone number, write your agent's system prompt, go live.\n"
                            "- PHONE NUMBERS: 31+ countries supported (US, UK, CA, AU, DE, FR, JP, SG and more). Numbers start from $1.15/mo.\n"
                            "- FEATURES: Appointment booking via Google Calendar, Shopify order lookups, human call transfer, missed-call auto-recovery, knowledge base (upload PDFs/URLs), Zoho CRM sync.\n"
                            "- AFTER CALLS: Full transcript, AI-generated summary, sentiment score, and action items — all emailed instantly.\n"
                            "- INDUSTRIES: Works for dental clinics, real estate, e-commerce, restaurants, law firms, SaaS support — any business that receives calls.\n"
                            "- TECH: Powered by Deepgram (voice), OpenAI (brain), Telnyx (telephony). Sub-second response latency.\n"
                            "- TO SIGN UP: Visit AIxCaller.com and click 'Start Building Free' — no credit card required.\n\n"
                            "DEMO RULES:\n"
                            "- This call auto-ends after 1 minute — be efficient and impressive.\n"
                            "- Keep every answer to 1-2 punchy sentences — it's a phone call.\n"
                            "- Be warm, natural, and confident. You ARE the product — show it off.\n"
                            "- If they ask to sign up or learn more: 'Just visit AIxCaller.com and click Start Building Free — takes under 5 minutes!'\n"
                            "- When they say goodbye or the conversation winds down, say a warm farewell and call end_call."
                        )

                        agent_config = {
                            "name": "Alex" if is_demo else agent.name,
                            "business_name": "AIxCaller" if is_demo else getattr(agent, "business_name", None),
                            "system_prompt": _DEMO_SYSTEM_PROMPT if is_demo else agent.system_prompt,
                            "voice_id": agent.voice_id,
                            "agent_id": str(agent.id),
                            "idle_timeout": 70 if is_demo else (agent.idle_timeout or 15),
                            "llm_temperature": agent.llm_temperature or 0.7,
                            "language": agent.language or "en",
                            "is_recovery": decoded.get("is_recovery", False),
                            "is_demo": is_demo,
                            # Human Transfer settings — disabled for demo
                            "forwarding_number":        None if is_demo else agent.forwarding_number,
                            "agent_phone_number":       agent.phone_number,
                            "human_transfer_enabled":   False if is_demo else getattr(agent, "human_transfer_enabled", False),
                            "human_transfer_timezone":  getattr(agent, "human_transfer_timezone", "UTC"),
                            "human_transfer_hours":     getattr(agent, "human_transfer_hours", {}) or {},
                            # Telephony
                            "call_control_id": call_control_id,
                            "call_session_id": call_session_id,
                            # Caller's incoming phone (for Shopify caller-ID verification)
                            "from_number":     decoded.get("from_number", "unknown"),
                            "to_number":       decoded.get("to_number", "unknown"),
                            "tools_config": {} if is_demo else (agent.tools_config or {})
                        }
                        # Inject tenant-level integration status
                        agent_config["tools_config"]["google_connected"] = getattr(tenant, "google_connected", False)
                    logger.info(f"Verified token for tenant {tenant_id}")
                    break
                except jwt.ExpiredSignatureError:
                    logger.error("Call token expired.")
                    await websocket.close()
                    return
                except Exception as e:
                    logger.error(f"Invalid call token: {e}")
                    await websocket.close()
                    return
        
        # 2. Initialize and Run the Agent after handshake is complete
        agent = VoiceAgent(tenant_id=tenant_id, agent_config=agent_config)
        await agent.start(
            websocket=websocket,
            stream_id=stream_id,
            call_id=call_control_id  # Pass call_control_id for Telnyx hangup API
        )
            
    except Exception as e:
        logger.error(f"Failed to handle voice stream: {e}", exc_info=True)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
