import asyncio
import os
import base64
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
import httpx

DEMO_SYSTEM_PROMPT = """You are Aria, the live voice demo agent for AIxCaller.live — an AI voice SaaS platform.
Be warm, enthusiastic, and concise. Keep all responses to 1-3 short sentences (voice-optimized).
Talk about: how AIxCaller works, use cases (AI receptionists, sales agents, support bots), 
pricing (starts at $29/month + pay-as-you-go minutes), integrations (CRM, Shopify, Telegram alerts), 
and how businesses deploy in under 5 minutes.
If asked off-topic questions, redirect warmly back to what AIxCaller can do for their business.
You are currently in a 2-minute live demo call. Be natural and conversational."""

DEMO_TIMEOUT = 110  # 110s then farewell before the UI 2-min cutoff


async def run_demo_session(websocket: WebSocket):
    """
    Manages a full browser-based demo voice session.

    Protocol:
      Client → Server : binary audio chunks (webm/opus via MediaRecorder)
      Server → Client : JSON  { type: "tts_audio", data: "<base64 mp3>" }
                               { type: "transcript", role: "user"|"assistant", text: "...", final: bool }
                               { type: "session_ended" }
    """
    conversation_history = [{"role": "system", "content": DEMO_SYSTEM_PROMPT}]
    # Use a list so nested async functions can mutate it (avoids nonlocal issues)
    state = {"is_speaking": False, "session_active": True}

    async def send(data: dict):
        try:
            if state["session_active"]:
                await websocket.send_json(data)
        except Exception:
            pass

    async def call_llm(history: list) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=history,
            max_tokens=100,
            temperature=0.7
        )
        return resp.choices[0].message.content.strip()

    async def speak(text: str):
        state["is_speaking"] = True
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(
                    "https://api.deepgram.com/v1/speak",
                    json={"text": text},
                    headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
                    params={"model": "aura-asteria-en", "encoding": "mp3"}
                )
                if resp.status_code == 200:
                    audio_b64 = base64.b64encode(resp.content).decode()
                    await send({"type": "tts_audio", "data": audio_b64})
                else:
                    logger.error(f"Deepgram TTS failed: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Demo TTS error: {e}")
        finally:
            state["is_speaking"] = False

    # --- Deepgram STT Setup (Raw WebSocket to bypass SDK conflicts) ---
    import websockets
    import json
    
    stt_url = (
        "wss://api.deepgram.com/v1/listen?"
        "model=nova-3&language=en-US&smart_format=true&endpointing=600&interim_results=true"
    )
    headers = {"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"}
    
    async def process_deepgram_stt(ws):
        try:
            async for msg in ws:
                data = json.loads(msg)
                
                # Check if it's a transcription result
                if data.get("type") == "Results":
                    channel = data.get("channel", {})
                    alts = channel.get("alternatives", [])
                    if not alts:
                        continue
                        
                    alt = alts[0]
                    text = alt.get("transcript", "").strip()
                    if not text:
                        continue
                        
                    is_final = data.get("is_final", False)
                    
                    if not is_final:
                        await send({"type": "transcript", "role": "user", "text": text, "final": False})
                        continue

                    # Final transcript — send and generate reply
                    await send({"type": "transcript", "role": "user", "text": text, "final": True})

                    if state["is_speaking"]:
                        continue

                    conversation_history.append({"role": "user", "content": text})
                    response = await call_llm(conversation_history)
                    conversation_history.append({"role": "assistant", "content": response})

                    await send({"type": "transcript", "role": "assistant", "text": response, "final": True})
                    await speak(response)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Deepgram connection closed")
        except Exception as e:
            logger.error(f"Deepgram STT processing error: {e}")

    try:
        dg_conn = await websockets.connect(stt_url, extra_headers=headers)
        # Start a background task to process incoming STT messages
        stt_task = asyncio.create_task(process_deepgram_stt(dg_conn))
    except Exception as e:
        logger.error(f"Failed to connect to Deepgram STT: {e}")
        await send({"type": "session_ended"})
        return

    logger.info("Demo session started — sending greeting")

    # Initial greeting
    await speak("Hi! I'm Aria, your live AIxCaller demo agent. You have 2 minutes — ask me anything about what this platform can do for your business!")

    async def audio_forwarder():
        """Forward browser audio chunks to Deepgram."""
        try:
            async for message in websocket.iter_bytes():
                if not state["session_active"]:
                    break
                await dg_conn.send(message)
        except WebSocketDisconnect:
            logger.info("Browser disconnected during demo")
        except Exception as e:
            logger.error(f"Audio forwarder error: {e}")
        finally:
            state["session_active"] = False

    try:
        await asyncio.wait_for(audio_forwarder(), timeout=DEMO_TIMEOUT)
    except asyncio.TimeoutError:
        logger.info("Demo session timed out — sending farewell")
        await speak("Your 2-minute demo has ended. Visit AIxCaller.live to sign up and deploy your own agent today. Goodbye!")
    finally:
        state["session_active"] = False
        try:
            await dg_conn.close()
            stt_task.cancel()
        except Exception:
            pass
        await send({"type": "session_ended"})
        logger.info("Demo session ended cleanly")
