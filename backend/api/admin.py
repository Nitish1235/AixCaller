import os
import asyncio
import secrets
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import base64
import httpx
from typing import List, Optional
from sqlmodel import Session, select
from datetime import datetime, timedelta
from shared.database import engine, get_db
from shared.models import VoiceOption, Tenant
from backend.api.billing import PLANS

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBasic()

# Admin Credentials
ADMIN_USER = "Nitish165"
ADMIN_PASS = "Nitish165@0"

def get_admin_user(credentials: HTTPBasicCredentials = Depends(security)):
    current_username_bytes = credentials.username.encode("utf8")
    correct_username_bytes = ADMIN_USER.encode("utf8")
    is_correct_username = secrets.compare_digest(
        current_username_bytes, correct_username_bytes
    )
    current_password_bytes = credentials.password.encode("utf8")
    correct_password_bytes = ADMIN_PASS.encode("utf8")
    is_correct_password = secrets.compare_digest(
        current_password_bytes, correct_password_bytes
    )
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Comprehensive List of Aura-2 English voices with characteristics
APPROVED_VOICES = {
    "aura-2-thalia-en":    "Thalia (F - Energetic/Confident)",
    "aura-2-amalthea-en":  "Amalthea (F - Engaging/Professional)",
    "aura-2-andromeda-en": "Andromeda (F - Casual/Expressive)",
    "aura-2-apollo-en":    "Apollo (M - Confident/Casual)",
    "aura-2-arcas-en":     "Arcas (M - Smooth/Natural)",
    "aura-2-aries-en":     "Aries (M - Warm/Caring)",
    "aura-2-aurora-en":    "Aurora (F - Cheerful/Friendly)",
    "aura-2-delia-en":     "Delia (F - Friendly/Approachable)",
    "aura-2-electra-en":   "Electra (F - Professional/Authoritative)",
    "aura-2-harmonia-en":  "Harmonia (F - Empathetic/Sincere)",
    "aura-2-helena-en":    "Helena (F - Caring/Natural)",
    "aura-2-hermes-en":    "Hermes (M - Professional/Knowledgeable)",
    "aura-2-hyperion-en":  "Hyperion (M - Empathetic/Confident)",
    "aura-2-juno-en":      "Juno (F - Melodic/Engaging)",
    "aura-2-jupiter-en":   "Jupiter (M - Knowledgeable/Authoritative)",
    "aura-2-mars-en":      "Mars (M - Trustworthy/Calm)",
    "aura-2-neptune-en":   "Neptune (M - Polite/Professional)",
    "aura-2-ophelia-en":   "Ophelia (F - Enthusiastic/Expressive)",
    "aura-2-orion-en":     "Orion (M - Polite/Friendly)",
    "aura-2-orpheus-en":   "Orpheus (M - Trustworthy/Warm)",
    "aura-2-phoebe-en":    "Phoebe (F - Warm/Sincere)",
    "aura-2-pluto-en":     "Pluto (M - Empathetic/Calm)",
    "aura-2-saturn-en":    "Saturn (M - Confident/Authoritative)",
    "aura-2-selene-en":    "Selene (F - Engaging/Clear)",
    "aura-2-theia-en":     "Theia (F - Sincere/Professional)",
    "aura-2-vesta-en":     "Vesta (F - Patient/Caring)",
    "aura-2-luna-en":      "Luna (F - Expressive/Cheerful)",
    "aura-2-odysseus-en":  "Odysseus (M - Strong/Direct)"
}

@router.post("/generate-voice-previews")
async def generate_voice_previews(admin: str = Depends(get_admin_user)):
    """
    Generates audio previews for all approved voices using Deepgram TTS
    and uploads them to Google Cloud Storage (GCS) for public access.
    """
    from google.cloud import storage
    
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "callerx-voice-previews")
    preview_script = "Hi, I'm your AI assistant from AIxcaller. How can I help you today?"
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize GCS: {e}")

    results = {"success": [], "failed": []}

    async with httpx.AsyncClient() as client:
        with Session(engine) as session:
            for voice_id, display_name in APPROVED_VOICES.items():
                try:
                    # 1. Call Deepgram TTS
                    response = await client.post(
                        f"https://api.deepgram.com/v1/speak?model={voice_id}",
                        headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
                        json={"text": preview_script}
                    )
                    
                    if response.status_code == 200:
                        # 2. Upload to GCS
                        blob_name = f"previews/{voice_id}.mp3"
                        blob = bucket.blob(blob_name)
                        blob.upload_from_string(response.content, content_type="audio/mpeg")
                        
                        # Make public (optional, based on bucket policy)
                        try:
                            blob.make_public()
                            public_url = blob.public_url
                        except:
                            public_url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
                        
                        # 3. Upsert into VoiceOption Table
                        statement = select(VoiceOption).where(VoiceOption.voice_id == voice_id)
                        voice_entry = session.exec(statement).first()
                        
                        if not voice_entry:
                            voice_entry = VoiceOption(
                                name=display_name.split(" (")[0],
                                voice_id=voice_id,
                                gender="Female" if "F - " in display_name else "Male"
                            )
                        
                        voice_entry.preview_url = public_url
                        session.add(voice_entry)
                        session.commit()
                        results["success"].append(voice_id)
                    else:
                        results["failed"].append({voice_id: f"Deepgram status {response.status_code}"})
                        
                except Exception as e:
                    results["failed"].append({voice_id: str(e)})
                    
    return {"message": "Voice catalog updated with cloud previews.", "details": results}

@router.get("/voices")
async def get_voices(db: Session = Depends(get_db), admin: str = Depends(get_admin_user)):
    """Returns all available voices for the frontend dropdown."""
    statement = select(VoiceOption)
    voices = db.exec(statement).all()
    return voices

@router.post("/assign-plan")
async def assign_plan(
    email: str, 
    plan_tier: str, 
    custom_minutes: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: str = Depends(get_admin_user)
):
    """
    Manually assign a plan to a user by their email.
    Bypasses payment and sets the user as active with the specified tier.
    """
    if plan_tier not in PLANS and plan_tier != "free":
        raise HTTPException(status_code=400, detail=f"Invalid plan tier: {plan_tier}")

    statement = select(Tenant).where(Tenant.contact_email == email)
    tenant = db.exec(statement).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="User with this email not found")

    # Get plan config
    plan_cfg = PLANS.get(plan_tier, {"minutes": 0})
    minutes = custom_minutes if custom_minutes is not None else plan_cfg.get("minutes", 0)

    # Update tenant subscription info
    tenant.plan_tier = plan_tier
    tenant.is_active = True
    tenant.subscription_status = "active"
    tenant.subscription_id = f"admin_manual_{secrets.token_hex(4)}"
    tenant.minutes_included = minutes
    tenant.minutes_used = 0.0  # Reset usage for the new cycle
    tenant.cycle_start = datetime.utcnow()
    tenant.cycle_end = datetime.utcnow() + timedelta(days=30)

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return {
        "message": f"Successfully assigned {plan_tier} plan to {email}",
        "tenant_id": str(tenant.id),
        "plan_tier": tenant.plan_tier,
        "minutes_included": tenant.minutes_included,
        "cycle_end": tenant.cycle_end.isoformat()
    }
