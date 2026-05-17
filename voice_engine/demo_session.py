"""
Browser-based live demo session (AIxCaller demo widget).

Architecture:
  Browser webm/opus (100ms chunks)
    → Deepgram STT WebSocket  (nova-2-general, speech_final trigger)
    → GPT-4o-mini streaming   (max 80 tokens)
    → Deepgram TTS WebSocket  (aura-2-thalia-en, linear16 PCM)
    → WAV-wrapped audio       → Browser (Web Audio decodeAudioData)

Latency optimisations (v2):
  • GREETING: pre-synthesised at server startup via Deepgram REST API.
              Stored as a cached WAV blob → sent to browser the instant the
              WebSocket opens.  Eliminates ~700 ms of TTS WS setup + synthesis
              on every demo session.
  • WS OPEN:  TTS + STT Deepgram WebSockets opened in parallel (asyncio.gather)
              instead of sequentially → saves ~300 ms.
  • KEEPALIVE: KeepAlive sent to TTS WS every 10 s so it never silently drops
              between the greeting and the first user query.
              (Silent drop was the root cause of the 6-10 s query lag:
              speak() was blocking on an 8 s timeout against a dead socket.)
  • TIMEOUT:  TTS Flush timeout 8 s → 5 s for faster error recovery.
  • STT:      endpointing 150 ms → 100 ms; utterance_end_ms 1000 → 700 ms.
  • CHUNKS:   MediaRecorder sends 100 ms chunks (frontend) instead of 250 ms,
              reducing STT buffering latency by up to 150 ms.
"""
import asyncio
import base64
import json
import os
import struct
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
import websockets

# ── Greeting constants ────────────────────────────────────────────────────────
# Short greeting = faster TTS synthesis on cache miss + smaller context token cost.
GREETING_TEXT = "Hi, I'm Aria! Ask me anything about AIxCaller."

# Filled by presynthesise_greeting() at server startup.
# None = cache miss → real-time synthesis fallback inside speak().
_CACHED_GREETING_WAV: bytes | None = None

DEMO_TIMEOUT = 110  # server enforces 110 s; UI shows 2-min countdown


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


# ── Greeting pre-synthesis ───────────────────────────────────────────────────
async def presynthesise_greeting() -> None:
    """Pre-synthesize the demo greeting WAV at server startup.

    Called once from voice_engine/main.py startup_event().
    On success every subsequent demo session sends the cached WAV the instant
    the WebSocket opens (~0 ms synthesis latency vs ~700 ms cold).
    Falls back silently to on-demand synthesis if Deepgram is unreachable.
    """
    global _CACHED_GREETING_WAV
    import httpx

    api_key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not set — greeting pre-synthesis skipped")
        return

    url = (
        "https://api.deepgram.com/v1/speak"
        "?model=aura-2-thalia-en"
        "&encoding=linear16"
        "&sample_rate=24000"
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Token {api_key}",
                    "Content-Type": "application/json",
                },
                json={"text": GREETING_TEXT},
            )
        if resp.status_code == 200:
            _CACHED_GREETING_WAV = _pcm_to_wav(resp.content, sample_rate=24_000)
            duration_s = len(resp.content) / 2 / 24_000
            logger.info(
                f"✅ Demo greeting pre-synthesized: "
                f"{len(_CACHED_GREETING_WAV):,} bytes  ({duration_s:.2f} s audio)"
            )
        else:
            logger.warning(
                f"Greeting pre-synthesis HTTP {resp.status_code}: {resp.text[:200]}"
            )
    except Exception as e:
        logger.warning(f"Greeting pre-synthesis failed (will synthesize on demand): {e}")


# ── Deepgram endpoint URLs ────────────────────────────────────────────────────
_TTS_WS_URL = (
    "wss://api.deepgram.com/v1/speak"
    "?model=aura-2-thalia-en"
    "&encoding=linear16"
    "&sample_rate=24000"
)

_STT_WS_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2-general"
    "&language=en-US"
    "&interim_results=true"
    "&endpointing=100"
    # utterance_end_ms minimum is 1000 ms per Deepgram API spec.
    # 700 caused HTTP 400 rejection; no_delay=true was also removed (deprecated).
    "&utterance_end_ms=1000"
)


# ── Prompt — keep short; fewer tokens = lower LLM TTFT ──────────────────────
DEMO_SYSTEM_PROMPT = (
    "You are Aria, AIxCaller's live demo voice agent. You're on a phone call.\n"
    "Rules: answer in 1-2 sentences max. Be warm and direct. Never use bullet points.\n"
    "AIxCaller: AI phone agents that handle calls 24/7, set up in 5 minutes.\n"
    "Plans: Starter $50/mo (200 min, 2 agents), Pro $119/mo (500 min), "
    "Premium $250/mo (1100 min, 4 agents).\n"
    "Integrations: Shopify order lookup, Google Calendar booking, Zoho/GoHighLevel CRMs."
)


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

    # ── Open TTS + STT WebSockets in PARALLEL ────────────────────────────────
    # Previously sequential: ~300 ms TTS + ~300 ms STT = ~600 ms before any work.
    # asyncio.gather opens both simultaneously → saves ~300 ms per session.
    dg_auth = {"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"}
    try:
        tts_ws, stt_ws = await asyncio.gather(
            websockets.connect(_TTS_WS_URL, additional_headers=dg_auth),
            websockets.connect(_STT_WS_URL, additional_headers=dg_auth),
        )
    except Exception as e:
        logger.error(f"Demo Deepgram WebSocket connect failed: {e}")
        await send({"type": "session_ended"})
        return

    # ── TTS reader ────────────────────────────────────────────────────────────
    # Background task: collects binary PCM chunks; on "Flushed" puts assembled
    # PCM on the queue so speak() can read it.
    _tts_results: asyncio.Queue[bytes] = asyncio.Queue()

    async def _tts_reader():
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
                    # KeepAlive ack / Cleared / Metadata — ignore
        except Exception:
            pass  # Connection closed or session ended

    tts_reader_task = asyncio.create_task(_tts_reader())

    # ── TTS keepalive ─────────────────────────────────────────────────────────
    # Deepgram TTS WebSockets silently time out after ~30–60 s of inactivity.
    # A user who takes >30 s to ask their first question would trigger speak()
    # to block on a dead socket until the 5 s timeout fires (was 8 s before).
    # Sending KeepAlive every 10 s prevents silent disconnections entirely.
    async def _tts_keepalive():
        try:
            while state["active"]:
                await asyncio.sleep(10)
                if state["active"] and not tts_ws.closed:
                    await tts_ws.send(json.dumps({"type": "KeepAlive"}))
        except Exception:
            pass  # Session ended or WS closed — expected

    keepalive_task = asyncio.create_task(_tts_keepalive())

    # ── speak() helper ────────────────────────────────────────────────────────
    async def speak(text: str):
        """Synthesise text, wait for audio, send WAV chunk to browser."""
        try:
            await tts_ws.send(json.dumps({"type": "Speak", "text": text}))
            await tts_ws.send(json.dumps({"type": "Flush"}))
            # Timeout: 5 s (was 8 s) — faster recovery if WS drops unexpectedly
            pcm = await asyncio.wait_for(_tts_results.get(), timeout=5.0)
            if pcm:
                wav = _pcm_to_wav(pcm)
                await send({"type": "tts_audio", "data": base64.b64encode(wav).decode()})
        except asyncio.TimeoutError:
            logger.warning("TTS Flush timed out (5 s) — skipping sentence")
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

    # ── STT processing ────────────────────────────────────────────────────────
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

                    # is_final but NOT speech_final = mid-utterance chunk — skip
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
                    # Backup: utterance_end_ms fired after silence.
                    if data.get("last_word_end", -1) == -1:
                        continue

        except websockets.exceptions.ConnectionClosed:
            logger.info("Demo STT connection closed")
        except Exception as e:
            logger.error(f"Demo STT error: {e}")

    stt_task = asyncio.create_task(_process_stt())

    # ── Greeting ──────────────────────────────────────────────────────────────
    # If pre-synthesized at startup → send cached WAV instantly (~0 ms synthesis).
    # The browser receives audio the moment the WebSocket opens, so the caller
    # hears Aria speak the instant they press the Start button.
    # Fallback: real-time synthesis via speak() if cache was never populated.
    logger.info("Demo session started — sending greeting")
    if _CACHED_GREETING_WAV:
        b64 = base64.b64encode(_CACHED_GREETING_WAV).decode()
        await send({"type": "tts_audio", "data": b64})
        conversation.append({"role": "assistant", "content": GREETING_TEXT})
        logger.info("✅ Greeting delivered from cache (~0 ms synthesis latency)")
    else:
        logger.info("Greeting cache miss — synthesizing on demand")
        await speak(GREETING_TEXT)

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
        for t in (stt_task, tts_reader_task, keepalive_task):
            t.cancel()
        for ws in (stt_ws, tts_ws):
            try:
                await ws.close()
            except Exception:
                pass
        await send({"type": "session_ended"})
        logger.info("Demo session ended cleanly")
