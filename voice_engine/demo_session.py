"""
Browser-based live demo session (AIxCaller demo widget).

Architecture:
  Browser webm/opus (100ms chunks)
    → Deepgram STT WebSocket  (nova-2-general, speech_final trigger)
    → gpt-4.1-mini streaming  (max 80 tokens)
    → Deepgram TTS WebSocket  (aura-2-thalia-en, linear16 PCM)
    → WAV-wrapped audio       → Browser (Web Audio decodeAudioData)

Latency optimisations:
  • GREETING: pre-synthesised at server startup via Deepgram REST API.
              Stored as a cached WAV blob → sent to browser the instant the
              WebSocket opens.  Eliminates ~700 ms of TTS WS setup + synthesis
              on every demo session.
  • WS OPEN:  TTS + STT Deepgram WebSockets opened in parallel (asyncio.gather)
              instead of sequentially → saves ~300 ms per session.
  • KEEPALIVE: KeepAlive sent to TTS WS every 5 s (was 10 s) to detect and
              prevent silent disconnections before the user's first query.
  • RECONNECT: speak() auto-reconnects the TTS WS on timeout and retries the
              sentence once.  Previous behaviour was to silently skip the
              sentence — the user heard nothing.
  • TIMEOUT:  TTS Flush timeout 5 s first attempt; 8 s after reconnect.
  • STT:      endpointing 100 ms; utterance_end_ms 1000 ms (API min).
  • CHUNKS:   MediaRecorder sends 100 ms chunks (frontend) instead of 250 ms,
              reducing STT buffering latency by up to 150 ms.
  • MODEL:    gpt-4.1-mini (~30 % lower median TTFB than gpt-4o-mini).
  • PRIMER:   1-token LLM warm-up call fired during greeting audio playback
              so the model instance is hot before the first real user query.
              Drops cold-start TTFB ~1.5 s → ~0.3 s on query 1.
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
GREETING_TEXT = "Hi, I'm Aria! Ask me anything about AIxCaller."

# Filled by presynthesise_greeting() at server startup.
# None = cache miss → real-time synthesis fallback inside speak().
_CACHED_GREETING_WAV: bytes | None = None

DEMO_TIMEOUT = 110  # server enforces 110 s; UI shows 2-min countdown


# ── WAV header helper ────────────────────────────────────────────────────────
def _pcm_to_wav(pcm: bytes, sample_rate: int = 24_000, channels: int = 1, bits: int = 16) -> bytes:
    """Wrap raw linear16 PCM in a RIFF/WAV container."""
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE",
        b"fmt ", 16,
        1,
        channels,
        sample_rate,
        sample_rate * channels * bits // 8,
        channels * bits // 8,
        bits,
        b"data", data_size,
    )
    return header + pcm


# ── Greeting pre-synthesis ───────────────────────────────────────────────────
async def presynthesise_greeting() -> None:
    """Pre-synthesize the demo greeting WAV at server startup."""
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
    "&utterance_end_ms=1000"
)


# ── Prompt ────────────────────────────────────────────────────────────────────
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

    openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    dg_auth = {"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"}

    async def send(data: dict):
        """Safe send — silently drops if session has ended."""
        try:
            if state["active"]:
                await websocket.send_json(data)
        except Exception:
            pass

    # ── Open TTS + STT WebSockets in PARALLEL ────────────────────────────────
    try:
        tts_ws, stt_ws = await asyncio.gather(
            websockets.connect(_TTS_WS_URL, additional_headers=dg_auth),
            websockets.connect(_STT_WS_URL, additional_headers=dg_auth),
        )
    except Exception as e:
        logger.error(f"Demo Deepgram WebSocket connect failed: {e}")
        await send({"type": "session_ended"})
        return

    # ── TTS connection manager ────────────────────────────────────────────────
    # _tts holds the live WS and its reader task in a mutable dict so that
    # speak(), keepalive, and reconnect all operate on the same reference.
    # Replacing _tts["ws"] automatically affects every closure on the next call.
    _tts_results: asyncio.Queue[bytes] = asyncio.Queue()
    _tts: dict = {"ws": tts_ws, "reader": None}

    def _launch_tts_reader(ws) -> asyncio.Task:
        """Spawn a reader task for the given TTS WebSocket."""
        async def _reader():
            chunks: list[bytes] = []
            try:
                async for msg in ws:
                    if isinstance(msg, bytes):
                        chunks.append(msg)
                    elif isinstance(msg, str):
                        try:
                            ev = json.loads(msg)
                        except Exception:
                            continue
                        if ev.get("type") == "Flushed":
                            await _tts_results.put(b"".join(chunks))
                            chunks = []
                        # KeepAlive ack / Cleared / Metadata — ignore
            except Exception:
                pass  # WS closed or session ended — expected
        return asyncio.create_task(_reader())

    _tts["reader"] = _launch_tts_reader(tts_ws)

    async def _reconnect_tts() -> None:
        """Close the dead TTS WS, open a fresh one, restart the reader.

        Called by speak() on a 5 s Flush timeout.  The old WebSocket has
        silently dropped (Deepgram closed the session server-side without
        sending a TCP FIN, so tts_ws.closed stays False and sends appear to
        succeed but no Flushed event ever arrives).

        After reconnect speak() retries the sentence on the fresh connection.
        """
        logger.warning("🔄 TTS WS dead — reconnecting…")

        # 1. Cancel stale reader (it's looping on a dead socket)
        old_reader = _tts.get("reader")
        if old_reader and not old_reader.done():
            old_reader.cancel()

        # 2. Close the dead socket (best-effort)
        try:
            await _tts["ws"].close()
        except Exception:
            pass

        # 3. Drain any stale items from the queue (they'll never arrive anyway)
        while not _tts_results.empty():
            try:
                _tts_results.get_nowait()
            except asyncio.QueueEmpty:
                break

        # 4. Open a fresh TTS WebSocket
        new_ws = await websockets.connect(_TTS_WS_URL, additional_headers=dg_auth)
        _tts["ws"] = new_ws

        # 5. Restart the reader on the new socket
        _tts["reader"] = _launch_tts_reader(new_ws)
        logger.info("✅ TTS WS reconnected — retrying sentence")

    # ── speak() ───────────────────────────────────────────────────────────────
    async def speak(text: str) -> None:
        """Synthesise text → send WAV chunk to browser.

        On a Flush timeout (dead TTS WS) the function reconnects once and
        retries the sentence instead of silently dropping it.
        """
        for attempt in range(2):
            try:
                ws = _tts["ws"]
                await ws.send(json.dumps({"type": "Speak", "text": text}))
                await ws.send(json.dumps({"type": "Flush"}))
                timeout = 5.0 if attempt == 0 else 8.0
                pcm = await asyncio.wait_for(_tts_results.get(), timeout=timeout)
                if pcm:
                    wav = _pcm_to_wav(pcm)
                    await send({"type": "tts_audio", "data": base64.b64encode(wav).decode()})
                return  # success — exit the retry loop

            except asyncio.TimeoutError:
                if attempt == 0:
                    # First timeout → reconnect, then loop back for attempt 1
                    try:
                        await _reconnect_tts()
                    except Exception as re:
                        logger.error(f"TTS reconnect failed: {re}")
                        return
                else:
                    logger.error("TTS Flush timed out after reconnect — skipping sentence")

            except Exception as e:
                logger.error(f"speak() error: {e}")
                return

    # ── TTS keepalive ─────────────────────────────────────────────────────────
    # 5 s interval (was 10 s).  Deepgram silently expires TTS WS sessions that
    # receive no Speak command.  KeepAlive resets the expiry timer.  We halved
    # the interval because empirical logs showed the WS dying before the 10 s
    # keepalive fired when the cached greeting skips all TTS WS traffic.
    async def _tts_keepalive() -> None:
        try:
            while state["active"]:
                await asyncio.sleep(5)
                ws = _tts["ws"]
                if state["active"] and not ws.closed:
                    await ws.send(json.dumps({"type": "KeepAlive"}))
        except Exception:
            pass

    keepalive_task = asyncio.create_task(_tts_keepalive())

    # ── LLM primer ────────────────────────────────────────────────────────────
    async def _prime_llm() -> None:
        """1-token warm-up call during greeting playback.

        gpt-4.1-mini TTFB on a cold instance is ~1.5–2 s.  Firing a throwaway
        call while the greeting plays (user hears ~2 s of audio) means the
        first real query hits a warm instance → TTFB ~0.3 s.
        """
        try:
            primer_messages = [
                {"role": "system", "content": DEMO_SYSTEM_PROMPT},
                {"role": "assistant", "content": GREETING_TEXT},
                {"role": "user", "content": "Hi."},
            ]
            await openai_client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=primer_messages,
                max_tokens=1,
                temperature=0,
            )
            logger.info("✅ Demo LLM primer complete — model instance warmed")
        except Exception as e:
            logger.warning(f"Demo LLM primer failed (non-fatal): {e}")

    # ── LLM streaming ─────────────────────────────────────────────────────────
    async def _llm_sentences(history: list):
        """Stream gpt-4.1-mini; yield one complete sentence at a time."""
        import re
        resp = await openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=history,
            max_tokens=80,
            temperature=0.3,
            stream=True,
        )
        buf = ""
        async for chunk in resp:
            delta = chunk.choices[0].delta.content
            if delta:
                buf += delta
                m = re.search(r"[.!?]+(?:\s|$)", buf)
                if m:
                    sentence = buf[: m.end()].strip()
                    buf = buf[m.end():]
                    if sentence:
                        yield sentence
        if buf.strip():
            yield buf.strip()

    # ── Response generation ───────────────────────────────────────────────────
    async def generate(user_text: str) -> None:
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
            if conversation and conversation[-1]["role"] == "user":
                conversation.pop()
        except Exception as e:
            logger.error(f"Demo generate error: {e}")
        finally:
            state["generating"] = False

    # ── STT processing ────────────────────────────────────────────────────────
    last_triggered_text: str = ""

    async def _process_stt() -> None:
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

                    # Interim result → interrupt bot if mid-response
                    if not is_final:
                        if state["generating"]:
                            await send({"type": "interrupt"})
                            if state["llm_task"] and not state["llm_task"].done():
                                state["llm_task"].cancel()
                            state["generating"] = False
                        continue

                    # is_final but not speech_final = mid-utterance chunk — skip
                    if not data.get("speech_final", False):
                        continue

                    # Deduplicate (UtteranceEnd can echo the same text)
                    if text == last_triggered_text:
                        continue
                    last_triggered_text = text

                    if state["llm_task"] and not state["llm_task"].done():
                        state["llm_task"].cancel()
                    await send({"type": "interrupt"})
                    state["llm_task"] = asyncio.create_task(generate(text))

                elif dtype == "UtteranceEnd":
                    if data.get("last_word_end", -1) == -1:
                        continue

        except websockets.exceptions.ConnectionClosed:
            logger.info("Demo STT connection closed")
        except Exception as e:
            logger.error(f"Demo STT error: {e}")

    stt_task = asyncio.create_task(_process_stt())

    # ── Greeting ──────────────────────────────────────────────────────────────
    logger.info("Demo session started — sending greeting")
    if _CACHED_GREETING_WAV:
        b64 = base64.b64encode(_CACHED_GREETING_WAV).decode()
        await send({"type": "tts_audio", "data": b64})
        conversation.append({"role": "assistant", "content": GREETING_TEXT})
        logger.info("✅ Greeting delivered from cache (~0 ms synthesis latency)")
    else:
        logger.info("Greeting cache miss — synthesizing on demand")
        await speak(GREETING_TEXT)

    # Fire LLM primer during greeting playback — warms model instance so first
    # real query TTFB drops from ~1.5 s → ~0.3 s.
    asyncio.create_task(_prime_llm())

    # ── Audio forwarding loop ─────────────────────────────────────────────────
    async def _forward_audio() -> None:
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
        reader = _tts.get("reader")
        for t in (stt_task, reader, keepalive_task):
            if t and not t.done():
                t.cancel()
        for ws in (stt_ws, _tts["ws"]):
            try:
                await ws.close()
            except Exception:
                pass
        await send({"type": "session_ended"})
        logger.info("Demo session ended cleanly")
