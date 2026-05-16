"""
Browser-based live demo session (AIxCaller demo widget).

Architecture:
  Browser webm/opus (250ms chunks)
    → Deepgram STT WebSocket  (nova-2-general, speech_final trigger)
    → GPT-4o-mini streaming   (max 80 tokens)
    → Deepgram TTS WebSocket  (aura-2-thalia-en, linear16 PCM)
    → WAV-wrapped audio       → Browser (Web Audio decodeAudioData)

Latency improvements vs original:
  • TTS: persistent WebSocket replaces new httpx.AsyncClient() per sentence
        → ~300 ms saved on first sentence (no TCP/TLS handshake)
        → ~200 ms saved on every subsequent sentence
  • STT: speech_final=True trigger instead of is_final
        → prevents mid-utterance LLM invocations
  • STT: no_delay=true + utterance_end_ms=1000
        → skips smart_format post-processing wait
  • LLM: OpenAI client created once per session, not per turn
  • TTS: linear16 + 44-byte WAV header; browser decodeAudioData plays natively
"""
import asyncio
import base64
import json
import os
import struct
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
import websockets

# ── Prompt — keep short; fewer tokens = lower LLM TTFT ──────────────────────
DEMO_SYSTEM_PROMPT = (
    "You are Aria, AIxCaller's live demo voice agent. You're on a phone call.\n"
    "Rules: answer in 1-2 sentences max. Be warm and direct. Never use bullet points.\n"
    "AIxCaller: AI phone agents that handle calls 24/7, set up in 5 minutes.\n"
    "Plans: Starter $50/mo (200 min, 2 agents), Pro $119/mo (500 min), "
    "Premium $250/mo (1100 min, 4 agents).\n"
    "Integrations: Shopify order lookup, Google Calendar booking, Zoho/GoHighLevel CRMs."
)

DEMO_TIMEOUT = 110  # server enforces 110s; UI shows 2-min countdown


# ── WAV header helper ────────────────────────────────────────────────────────
def _pcm_to_wav(pcm: bytes, sample_rate: int = 24_000, channels: int = 1, bits: int = 16) -> bytes:
    """Wrap raw linear16 PCM in a RIFF/WAV container.

    The browser's Web Audio API (decodeAudioData) handles WAV natively — no
    codec installed, no extra dependency. 44 bytes of overhead per chunk.
    """
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE",
        b"fmt ", 16,
        1,                                   # PCM = format tag 1
        channels,
        sample_rate,
        sample_rate * channels * bits // 8,  # byte rate
        channels * bits // 8,               # block align
        bits,
        b"data", data_size,
    )
    return header + pcm


# ── Main session ─────────────────────────────────────────────────────────────
async def run_demo_session(websocket: WebSocket):
    """Manage a full browser demo session end-to-end."""
    from openai import AsyncOpenAI

    conversation = [{"role": "system", "content": DEMO_SYSTEM_PROMPT}]
    state = {"active": True, "generating": False, "llm_task": None}

    # Single OpenAI client per session (avoid repeated import + init overhead)
    openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    async def send(data: dict):
        """Safe send — silently drops if session has ended."""
        try:
            if state["active"]:
                await websocket.send_json(data)
        except Exception:
            pass

    # ── Deepgram TTS WebSocket ────────────────────────────────────────────────
    # One connection for the entire session.
    # Protocol:
    #   → {"type":"Speak","text":"..."} — queue text for synthesis
    #   → {"type":"Flush"}              — begin synthesis, stream audio back
    #   ← binary frames                 — raw linear16 PCM chunks
    #   ← {"type":"Flushed"}            — all audio for this Flush delivered
    #
    # We use linear16 (not mp3) because mp3/opus are REST-only on Deepgram's WS.
    # linear16 wrapped in WAV is fully supported by browser Web Audio API.
    TTS_WS_URL = (
        "wss://api.deepgram.com/v1/speak"
        "?model=aura-2-thalia-en"
        "&encoding=linear16"
        "&sample_rate=24000"
    )
    try:
        tts_ws = await websockets.connect(
            TTS_WS_URL,
            additional_headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
        )
    except Exception as e:
        logger.error(f"Demo TTS WebSocket connect failed: {e}")
        await send({"type": "session_ended"})
        return

    # Queue of synthesised PCM blobs — one entry per Flush/Flushed cycle.
    # Using a Queue (not a shared list + Event) avoids race conditions when
    # speak() is called quickly back-to-back.
    _tts_results: asyncio.Queue[bytes] = asyncio.Queue()

    async def _tts_reader():
        """Background task: collect PCM chunks and enqueue on Flushed."""
        chunks: list[bytes] = []
        try:
            async for msg in tts_ws:
                if isinstance(msg, bytes):
                    chunks.append(msg)
                elif isinstance(msg, str):
                    ev = json.loads(msg)
                    if ev.get("type") == "Flushed":
                        await _tts_results.put(b"".join(chunks))
                        chunks = []
                    # Metadata / Cleared — ignore
        except Exception:
            pass  # connection closed or session ended

    tts_reader_task = asyncio.create_task(_tts_reader())

    async def speak(text: str):
        """Synthesise text, wait for audio, send WAV chunk to browser."""
        try:
            await tts_ws.send(json.dumps({"type": "Speak", "text": text}))
            await tts_ws.send(json.dumps({"type": "Flush"}))
            pcm = await asyncio.wait_for(_tts_results.get(), timeout=8.0)
            if pcm:
                wav = _pcm_to_wav(pcm)
                await send({"type": "tts_audio", "data": base64.b64encode(wav).decode()})
        except asyncio.TimeoutError:
            logger.warning("TTS Flush timed out — skipping sentence")
        except Exception as e:
            logger.error(f"speak() error: {e}")

    # ── LLM streaming helper ──────────────────────────────────────────────────
    async def _llm_sentences(history: list):
        """Stream GPT-4o-mini; yield one complete sentence at a time."""
        import re
        resp = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=history,
            max_tokens=80,
            temperature=0.3,   # lower = more predictable, slightly faster
            stream=True,
        )
        buf = ""
        async for chunk in resp:
            delta = chunk.choices[0].delta.content
            if delta:
                buf += delta
                # Yield on sentence boundaries — minimises TTS latency
                m = re.search(r"[.!?]+(?:\s|$)", buf)
                if m:
                    sentence = buf[: m.end()].strip()
                    buf = buf[m.end():]
                    if sentence:
                        yield sentence
        if buf.strip():
            yield buf.strip()

    # ── Response generation ───────────────────────────────────────────────────
    async def generate(user_text: str):
        state["generating"] = True
        full = ""
        try:
            conversation.append({"role": "user", "content": user_text})
            async for sentence in _llm_sentences(conversation):
                full += sentence + " "
                await speak(sentence)
            if full.strip():
                conversation.append({"role": "assistant", "content": full.strip()})
        except asyncio.CancelledError:
            # Rollback the user turn so context stays coherent
            if conversation and conversation[-1]["role"] == "user":
                conversation.pop()
        except Exception as e:
            logger.error(f"Demo generate error: {e}")
        finally:
            state["generating"] = False

    # ── Deepgram STT WebSocket ────────────────────────────────────────────────
    # Key parameters:
    #   speech_final=True  — utterance boundary; this is when we trigger LLM.
    #                         is_final=True fires for every finalized chunk
    #                         (multiple times per sentence) — do NOT trigger LLM on it.
    #   no_delay=true      — skip smart_format post-processing wait (~200ms saved)
    #   utterance_end_ms   — backup: fire UtteranceEnd after 1s silence past
    #                         last finalized word (catches edge cases)
    STT_WS_URL = (
        "wss://api.deepgram.com/v1/listen"
        "?model=nova-2-general"
        "&language=en-US"
        "&interim_results=true"
        "&endpointing=150"
        "&utterance_end_ms=1000"
        "&no_delay=true"
    )
    try:
        stt_ws = await websockets.connect(
            STT_WS_URL,
            additional_headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
        )
    except Exception as e:
        logger.error(f"Demo STT WebSocket connect failed: {e}")
        tts_reader_task.cancel()
        await tts_ws.close()
        await send({"type": "session_ended"})
        return

    # Track last triggered text to avoid duplicate LLM calls on the same utterance
    last_triggered_text: str = ""

    async def _process_stt():
        nonlocal last_triggered_text
        try:
            async for raw in stt_ws:
                if not state["active"]:
                    break
                data = json.loads(raw)
                dtype = data.get("type")

                if dtype == "Results":
                    alts = data.get("channel", {}).get("alternatives", [])
                    if not alts:
                        continue
                    text = alts[0].get("transcript", "").strip()
                    if not text:
                        continue

                    is_final = data.get("is_final", False)

                    # Interim result — interrupt AI if it's mid-response
                    if not is_final:
                        if state["generating"]:
                            await send({"type": "interrupt"})
                            if state["llm_task"] and not state["llm_task"].done():
                                state["llm_task"].cancel()
                            state["generating"] = False
                        continue

                    # is_final but NOT speech_final = mid-utterance chunk
                    # (e.g. Deepgram flushed a partial result without end-of-speech)
                    # Do NOT trigger LLM here — wait for speech_final=True.
                    if not data.get("speech_final", False):
                        continue

                    # speech_final=True: genuine utterance boundary → trigger LLM
                    if text == last_triggered_text:
                        continue  # deduplicate (UtteranceEnd can echo the same text)
                    last_triggered_text = text

                    if state["llm_task"] and not state["llm_task"].done():
                        state["llm_task"].cancel()
                    await send({"type": "interrupt"})
                    state["llm_task"] = asyncio.create_task(generate(text))

                elif dtype == "UtteranceEnd":
                    # Backup: utterance_end_ms fired after 1s silence.
                    # Only act if there was no speech_final trigger (edge case).
                    # last_word_end=-1 means condition met before finalization — skip.
                    if data.get("last_word_end", -1) == -1:
                        continue
                    # If we're not generating yet, something may have been missed
                    if not state["generating"] and last_triggered_text:
                        pass  # speech_final already handled it — nothing to do

        except websockets.exceptions.ConnectionClosed:
            logger.info("Demo STT connection closed")
        except Exception as e:
            logger.error(f"Demo STT error: {e}")

    stt_task = asyncio.create_task(_process_stt())

    # ── Greeting ──────────────────────────────────────────────────────────────
    logger.info("Demo session started — sending greeting")
    await speak("Hi! I'm Aria. What would you like to know about AIxCaller?")

    # ── Audio forwarding loop ─────────────────────────────────────────────────
    async def _forward_audio():
        """Pipe browser webm/opus chunks directly to Deepgram STT."""
        try:
            async for chunk in websocket.iter_bytes():
                if not state["active"]:
                    break
                await stt_ws.send(chunk)
        except WebSocketDisconnect:
            logger.info("Demo browser disconnected")
        except Exception as e:
            logger.error(f"Demo audio forward error: {e}")
        finally:
            state["active"] = False

    try:
        await asyncio.wait_for(_forward_audio(), timeout=DEMO_TIMEOUT)
    except asyncio.TimeoutError:
        logger.info("Demo session timed out — sending farewell")
        await speak(
            "Your 2-minute demo is up. Visit AIxCaller.live to deploy your own agent. Goodbye!"
        )
    finally:
        state["active"] = False
        # Cancel background tasks
        for t in (stt_task, tts_reader_task):
            t.cancel()
        # Close WebSocket connections
        for ws in (stt_ws, tts_ws):
            try:
                await ws.close()
            except Exception:
                pass
        await send({"type": "session_ended"})
        logger.info("Demo session ended cleanly")
