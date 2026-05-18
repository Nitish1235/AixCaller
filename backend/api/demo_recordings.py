"""
Demo Recording System
Generates realistic AI-vs-caller phone conversations via GPT + Deepgram TTS,
stitches audio with natural pauses, uploads to GCS, and exposes:
  - Admin endpoints (HTTPBasic protected) to generate & list recordings
  - One public endpoint for the landing-page showcase
"""

import asyncio
import io
import json
import logging
import os
import random
import secrets
import time
import uuid
import wave
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from openai import AsyncOpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "")
GCS_BUCKET_NAME  = os.environ.get("GCS_BUCKET_NAME", "callerx-voice-previews")
OPENAI_API_KEY   = os.environ.get("OPENAI_API_KEY", "")
ADMIN_USER       = os.environ.get("ADMIN_USER", "Nitish165")
ADMIN_PASS       = os.environ.get("ADMIN_PASS", "")

# Aura-2 voices — two distinct personas
CALLER_VOICE = "aura-2-orion-en"     # M · Polite / Friendly
AGENT_VOICE  = "aura-2-harmonia-en"  # F · Empathetic / Sincere

# WAV spec — must match what we request from Deepgram
SAMPLE_RATE = 24_000
CHANNELS    = 1
SAMPWIDTH   = 2  # bytes per sample (16-bit)

# ── Scenarios ─────────────────────────────────────────────────────────────────
SCENARIOS: dict[str, dict] = {
    "ecommerce": {
        "label":   "E-Commerce Support",
        "emoji":   "🛍️",
        "tagline": "Order status & instant resolution",
        "prompt": (
            "Write a realistic 5-turn phone conversation between a CUSTOMER and an AI SUPPORT AGENT "
            "for an e-commerce store. The customer's order #A-7749 hasn't arrived after 5 days. "
            "The agent looks it up, gives a reassuring status update, and offers SMS tracking. "
            "The customer is relieved and thanks the agent. "
            "Spoken tone — warm, professional, concise. Each turn: 1–2 short natural sentences."
        ),
    },
    "dental": {
        "label":   "Dental Receptionist",
        "emoji":   "🦷",
        "tagline": "Appointment booked in under 30 seconds",
        "prompt": (
            "Write a realistic 5-turn phone conversation between a PATIENT and an AI DENTAL RECEPTIONIST. "
            "The patient wants to book a teeth cleaning. The receptionist offers Thursday 2 PM or Friday 10 AM. "
            "The patient picks Thursday. The agent confirms with Dr. Martinez and says a text confirmation will follow. "
            "Spoken tone — friendly, warm. Each turn: 1–2 short natural sentences."
        ),
    },
    "realestate": {
        "label":   "Real Estate Agent",
        "emoji":   "🏠",
        "tagline": "Lead qualified & viewing scheduled",
        "prompt": (
            "Write a realistic 5-turn phone conversation between a HOME BUYER and an AI REAL ESTATE AGENT. "
            "The buyer saw the 3-bed listing at 124 Oak Street ($485k). The agent confirms availability, "
            "mentions a 9/10 school rating and renovated kitchen, then books a Saturday morning private viewing. "
            "Spoken tone — enthusiastic, knowledgeable. Each turn: 1–2 short natural sentences."
        ),
    },
}

# ── Auth ───────────────────────────────────────────────────────────────────────
_security = HTTPBasic()

def _require_admin(credentials: HTTPBasicCredentials = Depends(_security)) -> str:
    ok = (
        secrets.compare_digest(credentials.username.encode(), ADMIN_USER.encode()) and
        secrets.compare_digest(credentials.password.encode(), ADMIN_PASS.encode())
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# ── Schemas ────────────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    scenario: str
    custom_prompt: Optional[str] = None

class RecordingMeta(BaseModel):
    id: str
    scenario: str
    label: str
    emoji: str
    tagline: str
    script: list[dict]
    audio_url: str
    created_at: int
    duration_sec: float

# ── Router ─────────────────────────────────────────────────────────────────────
router = APIRouter(tags=["demo-recordings"])

# ── Audio pipeline helpers ─────────────────────────────────────────────────────

async def _generate_script(prompt: str) -> list[dict]:
    """GPT-4.1-mini → 5-turn JSON conversation script."""
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    resp = await client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{
            "role": "user",
            "content": (
                prompt + "\n\n"
                "Return ONLY a raw JSON array — no markdown, no code fences:\n"
                '[{"speaker":"caller","text":"..."},{"speaker":"agent","text":"..."},...]\n\n'
                "Rules:\n"
                "• Alternate caller → agent, starting with caller\n"
                "• Exactly 5 turns total\n"
                "• Each text: 1-2 sentences of natural phone speech\n"
                "• No filler words (um, uh, so, like)\n"
                "• Agent closes the call warmly on turn 5"
            ),
        }],
        max_tokens=500,
        temperature=0.85,
    )
    raw = resp.choices[0].message.content.strip()
    if "```" in raw:
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def _tts_wav(text: str, voice: str) -> bytes:
    """Deepgram TTS REST → WAV bytes (linear16, 24 kHz, mono)."""
    url = (
        f"https://api.deepgram.com/v1/speak"
        f"?model={voice}&encoding=linear16&sample_rate={SAMPLE_RATE}&container=wav"
    )
    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.post(
            url,
            headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"text": text},
        )
        r.raise_for_status()
        return r.content


def _pcm(wav_bytes: bytes) -> bytes:
    """Strip WAV header and return raw PCM frames."""
    with wave.open(io.BytesIO(wav_bytes)) as wf:
        return wf.readframes(wf.getnframes())


def _silence(seconds: float) -> bytes:
    """Silence PCM bytes at the configured spec."""
    return b"\x00" * int(SAMPLE_RATE * seconds) * CHANNELS * SAMPWIDTH


def _to_wav(pcm: bytes) -> bytes:
    """Wrap raw PCM in a proper WAV container."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPWIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    return buf.getvalue()


async def _gcs_put(data: bytes, blob_name: str, content_type: str = "audio/wav") -> str:
    """Upload bytes to GCS (bucket is publicly readable) → return public URL."""
    def _run() -> str:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob   = bucket.blob(blob_name)
        blob.upload_from_string(data, content_type=content_type)
        return f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{blob_name}"
    return await asyncio.to_thread(_run)


async def _gcs_list() -> list[dict]:
    """Scan GCS for demo recording metadata JSONs, newest first."""
    def _run() -> list[dict]:
        from google.cloud import storage
        client  = storage.Client()
        bucket  = client.bucket(GCS_BUCKET_NAME)
        blobs   = list(bucket.list_blobs(prefix="demo-recordings/"))
        records: list[dict] = []
        for blob in blobs:
            if blob.name.endswith(".json"):
                try:
                    records.append(json.loads(blob.download_as_bytes()))
                except Exception:
                    pass
        return sorted(records, key=lambda r: r.get("created_at", 0), reverse=True)
    return await asyncio.to_thread(_run)


async def _build_recording(scenario_key: str, prompt: str) -> RecordingMeta:
    """
    Full pipeline:
    1. GPT generates conversation script
    2. All TTS turns synthesized concurrently via Deepgram
    3. PCM stitched with 2–3 s silence gaps between speakers
    4. WAV + metadata JSON uploaded to GCS
    """
    scenario = SCENARIOS[scenario_key]
    rec_id   = uuid.uuid4().hex[:10]

    logger.info("[demo-rec] generating script for '%s'", scenario_key)
    script = await _generate_script(prompt)

    async def _synth(turn: dict) -> tuple[dict, bytes]:
        voice = CALLER_VOICE if turn["speaker"] == "caller" else AGENT_VOICE
        return turn, await _tts_wav(turn["text"], voice)

    pairs = await asyncio.gather(*[_synth(t) for t in script])
    logger.info("[demo-rec] TTS complete — %d turns", len(pairs))

    all_pcm = b""
    for i, (_, wav_bytes) in enumerate(pairs):
        all_pcm += _pcm(wav_bytes)
        if i < len(pairs) - 1:
            all_pcm += _silence(random.uniform(2.0, 3.0))

    final_wav    = _to_wav(all_pcm)
    duration_sec = len(all_pcm) / (SAMPLE_RATE * CHANNELS * SAMPWIDTH)
    logger.info("[demo-rec] stitched %.1fs WAV (%.0f KB)", duration_sec, len(final_wav) / 1024)

    wav_path  = f"demo-recordings/{scenario_key}/{rec_id}.wav"
    audio_url = await _gcs_put(final_wav, wav_path, "audio/wav")

    meta = {
        "id":           rec_id,
        "scenario":     scenario_key,
        "label":        scenario["label"],
        "emoji":        scenario["emoji"],
        "tagline":      scenario["tagline"],
        "script":       [{"speaker": t["speaker"], "text": t["text"]} for t, _ in pairs],
        "audio_url":    audio_url,
        "created_at":   int(time.time()),
        "duration_sec": round(duration_sec, 1),
    }
    await _gcs_put(
        json.dumps(meta, indent=2).encode(),
        f"demo-recordings/{scenario_key}/{rec_id}.json",
        "application/json",
    )

    logger.info("[demo-rec] uploaded → %s", audio_url)
    return RecordingMeta(**meta)


# ── Admin endpoints ────────────────────────────────────────────────────────────

@router.post("/admin/demo-recording/generate", response_model=RecordingMeta)
async def generate_demo_recording(
    body: GenerateRequest,
    _admin: str = Depends(_require_admin),
):
    """Generate a new demo call recording and upload to GCS."""
    if body.scenario not in SCENARIOS:
        raise HTTPException(400, detail=f"Unknown scenario. Valid: {list(SCENARIOS)}")
    prompt = body.custom_prompt or SCENARIOS[body.scenario]["prompt"]
    try:
        return await _build_recording(body.scenario, prompt)
    except Exception as exc:
        logger.error("[demo-rec] generation failed: %s", exc, exc_info=True)
        raise HTTPException(500, detail=str(exc))


@router.get("/admin/demo-recordings", response_model=list[RecordingMeta])
async def list_demo_recordings(_admin: str = Depends(_require_admin)):
    """List all demo recordings (newest first)."""
    try:
        return await _gcs_list()
    except Exception as exc:
        raise HTTPException(500, detail=str(exc))


# ── Public endpoint (landing page) ────────────────────────────────────────────

@router.get("/api/demo-recordings/showcase", response_model=list[RecordingMeta])
async def showcase_recordings():
    """No auth. Returns the newest recording per scenario (up to 3) for the landing page."""
    try:
        all_recs = await _gcs_list()
        seen: set[str] = set()
        featured: list[dict] = []
        for rec in all_recs:
            s = rec.get("scenario", "")
            if s in SCENARIOS and s not in seen:
                seen.add(s)
                featured.append(rec)
            if len(featured) == 3:
                break
        return featured
    except Exception as exc:
        raise HTTPException(500, detail=str(exc))
