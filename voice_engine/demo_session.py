import asyncio
import os
import base64
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
import httpx

DEMO_SYSTEM_PROMPT = """You are Aria, the AIxCaller live demo agent.
CRITICAL RULE: You are on a voice call. Keep answers extremely short. 1-2 sentences maximum. Do not ramble.
Core topics: AI receptionists, 24/7 call handling, 5-minute setup.
Pricing Plans:
- Starter ($50/mo): 200 mins, 2 agents.
- Pro ($119/mo): 500 mins, 2 agents.
- Premium ($250/mo): 1100 mins, 4 agents.
Integrations: Shopify (order lookup), Google Calendar (booking), Zoho/GoHighLevel CRMs.
Directly answer the user's question and stop."""

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
    # Use a list/dict so nested async functions can mutate it (avoids nonlocal issues)
    state = {
        "is_generating": False,
        "is_speaking": False, 
        "session_active": True,
        "llm_task": None
    }

    async def send(data: dict):
        try:
            if state["session_active"]:
                await websocket.send_json(data)
        except Exception:
            pass

    async def call_llm_stream(history: list):
        from openai import AsyncOpenAI
        import re
        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=history,
            max_tokens=80,
            temperature=0.5,
            stream=True
        )
        buffer = ""
        async for chunk in resp:
            delta = chunk.choices[0].delta.content
            if delta:
                buffer += delta
                match = re.search(r'([.!?]+(?:\s+|\n))', buffer)
                if match:
                    split_idx = match.end()
                    sentence = buffer[:split_idx].strip()
                    buffer = buffer[split_idx:]
                    if sentence:
                        yield sentence
        if buffer.strip():
            yield buffer.strip()

    async def get_tts(text_chunk: str):
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(
                    "https://api.deepgram.com/v1/speak",
                    json={"text": text_chunk},
                    headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
                    params={"model": "aura-asteria-en", "encoding": "mp3"}
                )
                if resp.status_code == 200:
                    return base64.b64encode(resp.content).decode()
        except Exception as e:
            logger.error(f"Demo TTS error: {e}")
        return None

    # Used for the initial greeting
    async def speak(text: str):
        state["is_speaking"] = True
        try:
            audio_b64 = await get_tts(text)
            if audio_b64:
                await send({"type": "tts_audio", "data": audio_b64})
        finally:
            state["is_speaking"] = False

    async def generate_response(text: str):
        state["is_generating"] = True
        full_response = ""
        tts_queue = asyncio.Queue()
        playback_task = None
        
        async def playback_worker():
            state["is_speaking"] = True
            try:
                while True:
                    task = await tts_queue.get()
                    if task is None:
                        break
                    audio_b64 = await task
                    if audio_b64:
                        await send({"type": "tts_audio", "data": audio_b64})
            except asyncio.CancelledError:
                pass
            finally:
                state["is_speaking"] = False

        try:
            playback_task = asyncio.create_task(playback_worker())
            conversation_history.append({"role": "user", "content": text})
            
            async for sentence in call_llm_stream(conversation_history):
                full_response += sentence + " "
                task = asyncio.create_task(get_tts(sentence))
                await tts_queue.put(task)
                
            await tts_queue.put(None)
            conversation_history.append({"role": "assistant", "content": full_response.strip()})
            await playback_task
        except asyncio.CancelledError:
            logger.info("Demo LLM/TTS generation interrupted")
            if playback_task:
                playback_task.cancel()
            if conversation_history and conversation_history[-1]["role"] == "user":
                conversation_history.pop()
        except Exception as e:
            logger.error(f"Error in demo generate_response: {e}")
        finally:
            state["is_generating"] = False


    # --- Deepgram STT Setup (Raw WebSocket to bypass SDK conflicts) ---
    import websockets
    import json
    
    stt_url = (
        "wss://api.deepgram.com/v1/listen?"
        "model=nova-2&language=en-US&smart_format=false&endpointing=150&interim_results=true"
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
                        # User is speaking — interrupt any active AI audio
                        if state["is_generating"] or state["is_speaking"]:
                            await send({"type": "interrupt"})
                            if state["llm_task"] and not state["llm_task"].done():
                                state["llm_task"].cancel()
                                state["llm_task"] = None
                            state["is_speaking"] = False
                            state["is_generating"] = False
                        continue

                    # Final transcript — fire LLM immediately

                    # Cancel any existing task just in case
                    if state["llm_task"] and not state["llm_task"].done():
                        state["llm_task"].cancel()
                    
                    await send({"type": "interrupt"}) # clear frontend audio buffer to be safe
                    state["llm_task"] = asyncio.create_task(generate_response(text))

        except websockets.exceptions.ConnectionClosed:

            logger.info("Deepgram connection closed")
        except Exception as e:
            logger.error(f"Deepgram STT processing error: {e}")

    try:
        dg_conn = await websockets.connect(stt_url, additional_headers=headers)
        # Start a background task to process incoming STT messages
        stt_task = asyncio.create_task(process_deepgram_stt(dg_conn))
    except Exception as e:
        logger.error(f"Failed to connect to Deepgram STT: {e}")
        await send({"type": "session_ended"})
        return

    logger.info("Demo session started — sending greeting")

    # Initial greeting
    await speak("Hi! I'm Aria. Ask me anything about AIxCaller.")

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
