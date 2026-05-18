"""
Browser-based live demo session (AIxCaller demo widget).

Architecture:
  Browser webm/opus (100ms chunks)
    → Deepgram STT WebSocket  (nova-2-general, speech_final trigger)
    → gpt-4.1-mini streaming  (max 80 tokens)
    → Deepgram TTS REST API   (aura-2-thalia-en, linear16 PCM)
    → WAV-wrapped audio       → Browser (Web Audio decodeAudioData)

Latency optimisations:
  • GREETING: pre-synthesised at server startup via Deepgram REST API.
              Stored as a cached WAV blob → sent to browser the instant the
              WebSocket opens.  Eliminates ~700 ms of TTS latency on every session.
  • TTS:      REST API per sentence (not WebSocket).  Deepgram's TTS WS silently
              expires its synthesis session ~15 s after last Flush regardless of
              KeepAlive messages, causing a 5 s timeout on first real query.
              REST API is stateless — never expires, no connection to manage.
              Per-sentence latency is ~300–450 ms, identical to a warm WS.
              A persistent httpx.AsyncClient reuses the TLS connection across
              sentences so there is no TLS handshake overhead after the first call.
  • STT:      endpointing 100 ms; utterance_end_ms 1000 ms (API min).
  • CHUNKS:   MediaRecorder sends 100 ms chunks (frontend), reducing buffering
              latency by up to 150 ms vs 250 ms default.
  • MODEL:    gpt-4.1-mini (~30 % lower median TTFB than gpt-4o-mini).
  • PRIMER:   LLM warm-up call fired during greeting playback (max_tokens=40)
              to warm the model instance AND seed OpenAI's prompt cache.
              DEMO_SYSTEM_PROMPT is ≥1024 tokens so the static prefix is cached
              after the primer → Q1 gets a cache hit → TTFB ~0.3 s instead of ~1.5 s.
"""
import asyncio
import base64
import json
import os
import struct
import httpx
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


# ── TTS REST endpoint ─────────────────────────────────────────────────────────
_TTS_REST_URL = (
    "https://api.deepgram.com/v1/speak"
    "?model=aura-2-thalia-en"
    "&encoding=linear16"
    "&sample_rate=24000"
)

# ── STT WebSocket endpoint ────────────────────────────────────────────────────
_STT_WS_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2-general"
    "&language=en-US"
    "&interim_results=true"
    "&endpointing=100"
    "&utterance_end_ms=1000"
)


# ── Greeting pre-synthesis ───────────────────────────────────────────────────
async def presynthesise_greeting() -> None:
    """Pre-synthesize the demo greeting WAV at server startup."""
    global _CACHED_GREETING_WAV

    api_key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not set — greeting pre-synthesis skipped")
        return

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                _TTS_REST_URL,
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


# ── System prompt ─────────────────────────────────────────────────────────────
DEMO_SYSTEM_PROMPT = (
    "You are Aria, AIxCaller's live demo voice agent. You're on a phone call.\n"
    "Rules: answer in 1-2 sentences max. Be warm and direct. Never use bullet points.\n\n"

    "ABOUT AIXCALLER:\n"
    "AIxCaller lets any business deploy AI phone agents that handle inbound and outbound calls "
    "24 hours a day, 7 days a week. Agents are set up in under 5 minutes by uploading business "
    "documents, PDFs, or website URLs. No coding is required. The AI learns the business data "
    "and answers caller questions accurately without hallucinating.\n\n"

    "PRICING PLANS:\n"
    "Starter: $50 per month — 200 minutes, 2 agents, basic analytics, email summaries.\n"
    "Pro: $119 per month — 500 minutes, 5 agents, advanced analytics, priority support.\n"
    "Premium: $250 per month — 1100 minutes, 4 agents, dedicated support, custom integrations.\n"
    "Enterprise: custom pricing for high-volume teams needing unlimited concurrency and SLA guarantees.\n"
    "All plans start with a free trial — no credit card required to sign up.\n\n"

    "KEY FEATURES:\n"
    "Real phone numbers: buy local or toll-free numbers instantly, or forward your existing line.\n"
    "Knowledge base: the agent is trained on the business owner's uploaded PDFs, URLs, or text.\n"
    "Natural voice: human-like speech using the latest neural TTS with full interruption support.\n"
    "Multilingual: 30 languages supported including Spanish, French, Hindi, Arabic, Portuguese.\n"
    "Analytics dashboard: full call transcripts, sentiment scores, action items, email summaries.\n"
    "Smart transfer: route calls to a human agent at any time, with custom business-hours schedules.\n"
    "Outbound calling: automated follow-ups, appointment reminders, and lead nurturing campaigns.\n\n"

    "INTEGRATIONS:\n"
    "Shopify: agent can look up order status, tracking numbers, items, totals, and refund status live.\n"
    "Google Calendar: agent checks real-time availability and books appointments directly.\n"
    "Zoho CRM: auto-sync call summaries, leads, and contacts after every call.\n"
    "GoHighLevel: native integration for marketing agencies reselling AI agents to their clients.\n"
    "HubSpot: push call data, create contacts, and log call notes automatically.\n"
    "Custom webhooks: connect to any internal tool or third-party API.\n\n"

    "COMMON QUESTIONS:\n"
    "Q: How long does setup take?\n"
    "A: Under 5 minutes. Upload business info, choose a voice, get a phone number, and go live.\n"
    "Q: Does it sound robotic?\n"
    "A: No. It uses the latest neural TTS voices. Most callers cannot tell it is an AI.\n"
    "Q: Can I try it for free?\n"
    "A: Yes. Visit AIxCaller.live and sign up — no credit card needed for the free trial.\n"
    "Q: Does it handle multiple calls at once?\n"
    "A: Yes, unlimited concurrent calls on all plans. It never rings busy.\n"
    "Q: What if the caller wants a real person?\n"
    "A: The agent can transfer the call to a human number instantly, with custom hours.\n"
    "Q: Is the data secure?\n"
    "A: Yes — SOC2 compliant, all data encrypted at rest and in transit.\n"
    "Q: Can it make outbound calls?\n"
    "A: Yes — for follow-ups, reminders, and lead campaigns.\n"
    "Q: What industries use AIxCaller?\n"
    "A: E-commerce, healthcare, real estate, restaurants, law firms, agencies, and more.\n\n"

    "GETTING STARTED:\n"
    "Sign up free at AIxCaller.live. Onboarding takes under 5 minutes. "
    "Support is available 24/7 via live chat and email."
)


# ── Main session ─────────────────────────────────────────────────────────────
async def run_demo_session(websocket: WebSocket):
    """Manage a full browser demo session end-to-end."""
    from openai import AsyncOpenAI

    conversation = [{"role": "system", "content": DEMO_SYSTEM_PROMPT}]
    state = {"active": True, "generating": False, "llm_task": None}

    openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    dg_key = os.environ["DEEPGRAM_API_KEY"]

    async def send(data: dict):
        """Safe send — silently drops if session has ended."""
        try:
            if state["active"]:
                await websocket.send_json(data)
        except Exception:
            pass

    # ── Open STT WebSocket ────────────────────────────────────────────────────
    try:
        stt_ws = await websockets.connect(
            _STT_WS_URL,
            additional_headers={"Authorization": f"Token {dg_key}"},
        )
    except Exception as e:
        logger.error(f"Demo STT WebSocket connect failed: {e}")
        await send({"type": "session_ended"})
        return

    # ── Persistent TTS HTTP client ────────────────────────────────────────────
    # Reuses the TLS connection across sentences (HTTP keep-alive).
    # No session state, no expiry, no reconnect logic needed.
    tts_client = httpx.AsyncClient(
        timeout=10.0,
        headers={
            "Authorization": f"Token {dg_key}",
            "Content-Type": "application/json",
        },
    )

    # ── speak() ───────────────────────────────────────────────────────────────
    async def speak(text: str) -> None:
        """Synthesise text via Deepgram REST → send WAV to browser."""
        try:
            resp = await tts_client.post(_TTS_REST_URL, json={"text": text})
            if resp.status_code == 200 and resp.content:
                wav = _pcm_to_wav(resp.content)
                await send({"type": "tts_audio", "data": base64.b64encode(wav).decode()})
            else:
                logger.error(f"TTS REST {resp.status_code}: {resp.text[:120]}")
        except Exception as e:
            logger.error(f"speak() error: {e}")

    # ── LLM primer ────────────────────────────────────────────────────────────
    async def _prime_llm() -> None:
        """Warm-up call fired during greeting playback.

        Generates a real short response (max_tokens=40) so the model instance
        does enough work for OpenAI to route Q1 to the same warmed instance.
        DEMO_SYSTEM_PROMPT is ≥1024 tokens → static prefix is cached after
        this call, so Q1 gets a prompt-cache hit → TTFB ~0.3 s.
        """
        try:
            await openai_client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system",    "content": DEMO_SYSTEM_PROMPT},
                    {"role": "assistant", "content": GREETING_TEXT},
                    {"role": "user",      "content": "What can you do?"},
                ],
                max_tokens=40,
                temperature=0,
            )
            logger.info("✅ Demo LLM primer complete — model warmed + prompt cache seeded")
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

    # Fire LLM primer in background during greeting playback.
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
        if stt_task and not stt_task.done():
            stt_task.cancel()
        try:
            await stt_ws.close()
        except Exception:
            pass
        await tts_client.aclose()
        await send({"type": "session_ended"})
        logger.info("Demo session ended cleanly")
