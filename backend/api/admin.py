"""
Admin API — Protected management endpoints.
All routes require HTTP Basic authentication (ADMIN_USER + ADMIN_PASS env vars).
"""
import os
import secrets
import json
import base64
import asyncio
import websockets
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from typing import Optional
from sqlmodel import Session, select
from datetime import datetime, timedelta

from shared.database import get_db
from shared.models import Tenant, SystemSettings
from backend.api.billing import PLANS

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBasic()

ADMIN_USER = os.environ.get("ADMIN_USER", "Nitish165")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "")

# Telnyx Ultra voice catalogue — presented in the dashboard voice selector
# IMPORTANT: Replace the placeholders below with the actual UUIDs from your Telnyx Voice Playground!
TELNYX_VOICES = [
    {"voice_id": "Telnyx.Ultra.f786b574-daa5-4673-aa0c-cbe3e8534c02", "name": "Katie",  "gender": "Female", "style": "Friendly Fixer"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_GRACE_UUID>",    "name": "Grace",    "gender": "Female", "style": "Professional / Warm"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_GEORGE_UUID>",   "name": "George",   "gender": "Male",   "style": "Professional / Confident"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_AVA_UUID>",      "name": "Ava",      "gender": "Female", "style": "Friendly / Bright"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_JAMES_UUID>",    "name": "James",    "gender": "Male",   "style": "Calm / Authoritative"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_EMMA_UUID>",     "name": "Emma",     "gender": "Female", "style": "Empathetic / Sincere"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_DANIEL_UUID>",   "name": "Daniel",   "gender": "Male",   "style": "Warm / Trustworthy"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_ALLIE_UUID>",    "name": "Allie",    "gender": "Female", "style": "Friendly / Expressive"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_BENJI_UUID>",    "name": "Benji",    "gender": "Male",   "style": "Playful / High-energy"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_RONALD_UUID>",   "name": "Ronald",   "gender": "Male",   "style": "Mature / Reassuring"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_WESLEY_UUID>",   "name": "Wesley",   "gender": "Male",   "style": "Clean / Clear"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_MIA_UUID>",      "name": "Mia",      "gender": "Female", "style": "Direct / Business"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_HOWARD_UUID>",   "name": "Howard",   "gender": "Male",   "style": "Deep / Narrative"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_HARRY_UUID>",    "name": "Harry",    "gender": "Male",   "style": "Youthful / Casual"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_JASPER_UUID>",   "name": "Jasper",   "gender": "Male",   "style": "Smooth / Conversational"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_ARVIN_UUID>",    "name": "Arvin",    "gender": "Male",   "style": "Energetic / Direct"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_CALLIE_UUID>",   "name": "Callie",   "gender": "Female", "style": "Bright / Engaging"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_SKYLER_UUID>",   "name": "Skyler",   "gender": "Female", "style": "Natural / Conversational"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_DARIUS_UUID>",   "name": "Darius",   "gender": "Male",   "style": "Professional / Grounded"},
    {"voice_id": "Telnyx.Ultra.<REPLACE_WITH_KELSEY_UUID>",   "name": "Kelsey",   "gender": "Female", "style": "Soft / Gentle"},
]


def get_admin_user(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    ok = (
        secrets.compare_digest(credentials.username.encode(), ADMIN_USER.encode())
        and secrets.compare_digest(credentials.password.encode(), ADMIN_PASS.encode())
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


# ─────────────────────────────────────────────────────────────────────────────
# VOICES — Return available Telnyx voice catalogue
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/voices")
async def get_voices(admin: str = Depends(get_admin_user)):
    """Returns the Telnyx Ultra voice catalogue for the agent creation UI."""
    return {"voices": TELNYX_VOICES}


@router.post("/generate-voice-previews")
async def generate_voice_previews(
    db: Session = Depends(get_db),
    admin: str = Depends(get_admin_user)
):
    """
    Synthesize high-quality speech preview samples for all 19 Telnyx Ultra voices
    using Telnyx TTS API, and upload them to Google Cloud Storage.
    """
    import httpx
    from loguru import logger
    
    telnyx_api_key = os.environ.get("TELNYX_API_KEY")
    if not telnyx_api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing TELNYX_API_KEY environment variable on backend."
        )
        
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "aixcaller-assets")
    
    try:
        from google.cloud import storage
        gcs_client = storage.Client()
        bucket = gcs_client.bucket(bucket_name)
    except Exception as e:
        logger.error(f"Failed to initialize GCS client: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize GCS client: {str(e)}. Check GCP credentials."
        )
        
    success_voices = []
    failed_voices = []
    
    for voice in TELNYX_VOICES:
        v_id = voice["voice_id"]
        v_name = voice["name"]
        text = f"Hello! I am {v_name}, one of the ultra premium voices provided by Telnyx. I am ready to be used for your AI voice assistant."
        
        url = "https://api.telnyx.com/v2/text-to-speech/speech"
        headers = {"Authorization": f"Bearer {telnyx_api_key}", "Content-Type": "application/json"}
        payload = {
            "voice": v_id,
            "text": text
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=30.0)
                
            if response.status_code != 200:
                logger.error(f"Telnyx HTTP TTS failed for {v_name}: {response.status_code} - {response.text}")
                failed_voices.append(v_name)
                continue
                
            audio_bytes = response.content
            
            if not audio_bytes:
                logger.error(f"Telnyx HTTP TTS failed for {v_name}: No audio received")
                failed_voices.append(v_name)
                continue
                
            blob_name = f"voices/telnyx_ultra_{v_name.lower()}.mp3"
            blob = bucket.blob(blob_name)
            
            # Running in a threadpool to avoid blocking event loop
            await run_in_threadpool(blob.upload_from_string, bytes(audio_bytes), "audio/mpeg")
            
            try:
                await run_in_threadpool(blob.make_public)
                public_url = blob.public_url
            except Exception as e:
                logger.warning(f"Could not make blob public: {e}")
                public_url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
                
            logger.info(f"Uploaded preview for {v_name} to {public_url}")
            success_voices.append({"name": v_name, "url": public_url})
            
        except Exception as e:
            logger.error(f"Exception generating voice preview for {v_name}: {e}")
            failed_voices.append(v_name)
                
    return {
        "message": f"Voice previews generation completed: {len(success_voices)} succeeded, {len(failed_voices)} failed.",
        "details": {
            "success": success_voices,
            "failed": failed_voices
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# PLAN ASSIGNMENT — Manually assign a plan to a tenant
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/assign-plan")
async def assign_plan(
    email: str,
    plan_tier: str,
    custom_minutes: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: str = Depends(get_admin_user),
):
    """
    Manually assign a subscription plan to a tenant.
    Bypasses payment for testing or manual activation.
    """
    valid_tiers = list(PLANS.keys()) + ["free"]
    if plan_tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid plan tier: {plan_tier}. Valid: {valid_tiers}")

    tenant = db.exec(select(Tenant).where(Tenant.contact_email.ilike(email))).first()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"No user found with email: {email}")

    plan_cfg = PLANS.get(plan_tier, {})
    default_minutes = {"starter": 200, "pro": 500, "premium": 1100, "free": 0}

    if custom_minutes is not None and custom_minutes > 0:
        minutes = custom_minutes
    else:
        minutes = plan_cfg.get("minutes") or default_minutes.get(plan_tier, 0)

    tenant.plan_tier = plan_tier
    tenant.is_active = True
    tenant.subscription_status = "active"
    tenant.subscription_id = f"admin_manual_{secrets.token_hex(4)}"
    tenant.minutes_included = int(minutes)
    tenant.minutes_used = 0.0
    tenant.cycle_start = datetime.utcnow()
    tenant.cycle_end = datetime.utcnow() + timedelta(days=30)

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return {
        "message":          f"Plan '{plan_tier}' assigned to {email}",
        "tenant_id":        str(tenant.id),
        "plan_tier":        tenant.plan_tier,
        "minutes_included": tenant.minutes_included,
        "cycle_end":        tenant.cycle_end.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# TENANT LIST — Overview of all tenants
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenants")
async def list_tenants(db: Session = Depends(get_db), admin: str = Depends(get_admin_user)):
    """Returns a summary of all tenants for the admin dashboard."""
    tenants = db.exec(select(Tenant).order_by(Tenant.created_at.desc())).all()
    return {
        "count": len(tenants),
        "tenants": [
            {
                "id":                  str(t.id),
                "name":                t.name,
                "email":               t.contact_email,
                "plan_tier":           t.plan_tier,
                "subscription_status": t.subscription_status,
                "minutes_used":        round(t.minutes_used, 2),
                "minutes_included":    t.minutes_included,
                "is_active":           t.is_active,
                "created_at":          t.created_at.isoformat(),
            }
            for t in tenants
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# USAGE RESET — Reset a tenant's minute usage for the current cycle
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/reset-usage")
async def reset_usage(
    email: str,
    db: Session = Depends(get_db),
    admin: str = Depends(get_admin_user),
):
    """Reset a tenant's minutes_used to 0 (for manual cycle resets)."""
    tenant = db.exec(select(Tenant).where(Tenant.contact_email.ilike(email))).first()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"No user found with email: {email}")

    tenant.minutes_used = 0.0
    db.add(tenant)
    db.commit()

    return {"message": f"Usage reset for {email}", "minutes_used": 0.0}


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL SETTINGS — Get & update global model and API keys
# ─────────────────────────────────────────────────────────────────────────────
from pydantic import BaseModel
import httpx
from loguru import logger

class AdminSettingsRequest(BaseModel):
    global_model: str
    api_key: Optional[str] = None


@router.get("/settings")
async def get_settings(
    db: Session = Depends(get_db),
    admin: str = Depends(get_admin_user),
):
    """Retrieve global system settings."""
    settings = db.exec(select(SystemSettings).where(SystemSettings.id == 1)).first()
    if not settings:
        settings = SystemSettings(id=1, global_model="openai/gpt-4o-mini", api_key=None, telnyx_secret_id=None)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    masked_key = None
    if settings.api_key:
        if len(settings.api_key) > 8:
            masked_key = f"{settings.api_key[:4]}...{settings.api_key[-4:]}"
        else:
            masked_key = "********"

    return {
        "global_model": settings.global_model,
        "api_key": masked_key,
        "has_api_key": bool(settings.api_key),
        "telnyx_secret_id": settings.telnyx_secret_id,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }


@router.post("/settings")
async def update_settings(
    req: AdminSettingsRequest,
    db: Session = Depends(get_db),
    admin: str = Depends(get_admin_user),
):
    """Update global system settings and sync with Telnyx Integration Secrets."""
    settings = db.exec(select(SystemSettings).where(SystemSettings.id == 1)).first()
    if not settings:
        settings = SystemSettings(id=1, global_model="openai/gpt-4o-mini", api_key=None, telnyx_secret_id=None)

    telnyx_api_key = os.environ.get("TELNYX_API_KEY")
    if not telnyx_api_key:
        raise HTTPException(status_code=500, detail="Missing TELNYX_API_KEY on backend server — cannot register secrets with Telnyx.")

    # API key update logic
    if req.api_key is not None:
        is_placeholder = "..." in req.api_key or req.api_key == "********"
        if not is_placeholder and req.api_key.strip():
            new_key = req.api_key.strip()
            if new_key != settings.api_key:
                if settings.telnyx_secret_id:
                    await delete_telnyx_integration_secret(telnyx_api_key, settings.telnyx_secret_id)
                
                secret_id = await create_telnyx_integration_secret(telnyx_api_key, new_key)
                if not secret_id:
                    raise HTTPException(status_code=500, detail="Failed to register custom API key with Telnyx Integration Secrets API.")
                
                settings.api_key = new_key
                settings.telnyx_secret_id = secret_id
        elif not req.api_key.strip():
            if settings.telnyx_secret_id:
                await delete_telnyx_integration_secret(telnyx_api_key, settings.telnyx_secret_id)
            settings.api_key = None
            settings.telnyx_secret_id = None
    
    settings.global_model = req.global_model
    settings.updated_at = datetime.utcnow()

    db.add(settings)
    db.commit()
    db.refresh(settings)

    return {"status": "saved", "global_model": settings.global_model, "has_api_key": bool(settings.api_key)}


async def create_telnyx_integration_secret(api_key: str, secret_value: str) -> Optional[str]:
    url = "https://api.telnyx.com/v2/integration_secrets"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "identifier": f"aixcaller_global_api_key_{secrets.token_hex(4)}",
        "value": secret_value
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=15.0)
            if response.status_code in [200, 201]:
                resp_json = response.json()
                return resp_json.get("data", {}).get("id")
            else:
                logger.error(f"Failed to create Telnyx secret: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception creating Telnyx secret: {e}")
            return None


async def delete_telnyx_integration_secret(api_key: str, secret_id: str):
    url = f"https://api.telnyx.com/v2/integration_secrets/{secret_id}"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    async with httpx.AsyncClient() as client:
        try:
            await client.delete(url, headers=headers, timeout=10.0)
        except Exception as e:
            logger.error(f"Failed to delete old Telnyx secret: {e}")
