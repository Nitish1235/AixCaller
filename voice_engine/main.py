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
                            
                        # ── Credit Gate ───────────────────────────────────────────────
                        minutes_used = tenant.minutes_used or 0.0
                        minutes_included = tenant.minutes_included or 0
                        if minutes_used >= minutes_included:
                            logger.warning(f"Tenant {tenant_id} out of minutes ({minutes_used}/{minutes_included}). Blocking call.")
                            await websocket.close()
                            return
                        # ──────────────────────────────────────────────────────────────

                        agent = db.get(Agent, agent_id)
                        if not agent:
                            logger.error(f"Agent {agent_id} not found in DB")
                            await websocket.close()
                            return
                        
                        agent_config = {
                            "name": agent.name,
                            "business_name": getattr(agent, "business_name", None),
                            "system_prompt": agent.system_prompt,
                            "voice_id": agent.voice_id,
                            "agent_id": str(agent.id),
                            "idle_timeout": agent.idle_timeout or 7,
                            "llm_temperature": agent.llm_temperature or 0.7,
                            "language": agent.language or "en",
                            "is_recovery": decoded.get("is_recovery", False),
                            # Human Transfer settings
                            "forwarding_number":        agent.forwarding_number,
                            "agent_phone_number":       agent.phone_number,  # Telnyx number — "from" on transfer
                            "human_transfer_enabled":   getattr(agent, "human_transfer_enabled", False),
                            "human_transfer_timezone":  getattr(agent, "human_transfer_timezone", "UTC"),
                            "human_transfer_hours":     getattr(agent, "human_transfer_hours", {}) or {},
                            # Telephony
                            "call_control_id": call_control_id,
                            "call_session_id": call_session_id,
                            # Caller's incoming phone (for Shopify caller-ID verification)
                            "from_number":     start_data.get("from"),
                            "to_number":       start_data.get("to"),
                            "tools_config": agent.tools_config or {}
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
