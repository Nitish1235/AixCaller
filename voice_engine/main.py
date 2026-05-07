import os
import json
import asyncio
import jwt
from fastapi import FastAPI, WebSocket
from loguru import logger
import traceback
from sqlmodel import Session
from shared.database import engine
from shared.models import Agent

try:
    from voice_engine.bot import VoiceAgent
    from voice_engine.demo_session import run_demo_session
except Exception as e:
    print(f"CRITICAL STARTUP CRASH: {traceback.format_exc()}")
    raise

app = FastAPI(title="AIxcaller Voice Engine")

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
                    secret = os.environ.get("JWT_SECRET", "super-secret-key")
                    decoded = jwt.decode(token, secret, algorithms=["HS256"])
                    
                    tenant_id = decoded["tenant_id"]
                    agent_id = decoded["agent_id"]
                    
                    # 2. Fetch full config from DB (since JWT is now minimal)
                    with Session(engine) as db:
                        agent = db.get(Agent, agent_id)
                        if not agent:
                            logger.error(f"Agent {agent_id} not found in DB")
                            await websocket.close()
                            return
                        
                        agent_config = {
                            "system_prompt": agent.system_prompt,
                            "voice_id": agent.voice_id,
                            "agent_id": str(agent.id),
                            "idle_timeout": agent.idle_timeout or 7,
                            "llm_temperature": agent.llm_temperature or 0.7,
                            "language": agent.language or "en",
                            "is_recovery": decoded.get("is_recovery", False),
                            "forwarding_number": agent.forwarding_number,
                            "call_control_id": call_control_id,
                            "call_session_id": call_session_id,
                            "tools_config": agent.tools_config or {}
                        }
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
