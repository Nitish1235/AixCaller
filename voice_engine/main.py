import os
import json
import asyncio
import jwt
from fastapi import FastAPI, WebSocket
from loguru import logger
from voice_engine.bot import VoiceAgent
from voice_engine.demo_session import run_demo_session

app = FastAPI(title="AIxcaller Voice Engine")

@app.websocket("/demo")
async def demo_endpoint(websocket: WebSocket):
    """
    Browser-based live demo WebSocket.
    No Plivo. No auth token. Accepts raw webm/opus audio from browser MediaRecorder.
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
    WebSocket handler for real-time audio streams from Plivo.
    """
    await websocket.accept()
    logger.info("Connection accepted from Plivo.")

    try:
        # Wait for Plivo protocol handshake
        while True:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            msg = json.loads(raw)
            event = msg.get("event")

            if event == "connected":
                logger.info(f"Plivo connected. Waiting for start event...")
                continue

            if event == "start":
                start_data = msg.get("start", {})
                stream_id = start_data.get("streamId")
                call_id = start_data.get("callId")
                params = start_data.get("parameterData", {})
                
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
                    agent_config = {
                        "system_prompt": decoded["system_prompt"],
                        "voice_id": decoded["voice_id"],
                        "agent_id": decoded["agent_id"],
                        "idle_timeout": decoded.get("idle_timeout", 7),
                        "llm_temperature": decoded.get("llm_temperature", 0.7),
                        "language": decoded.get("language", "en"),
                        "is_recovery": decoded.get("is_recovery", False)
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
            call_id=call_id
        )
            
    except Exception as e:
        logger.error(f"Failed to handle voice stream: {e}", exc_info=True)
    finally:
        await websocket.close()
