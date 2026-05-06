import os
import asyncio
from fastapi import APIRouter, HTTPException, Depends
import base64
import httpx
from typing import List
from sqlmodel import Session, select
from shared.database import engine, get_db
from shared.models import VoiceOption

router = APIRouter(prefix="/admin", tags=["admin"])

# Comprehensive List of Aura-2 English voices
APPROVED_VOICES = {
    "aura-2-thalia-en":    "Thalia (F - Energetic)",
    "aura-2-amalthea-en":  "Amalthea (F - Engaging)",
    "aura-2-andromeda-en": "Andromeda (F - Casual)",
    "aura-2-apollo-en":    "Apollo (M - Confident)",
    "aura-2-arcas-en":     "Arcas (M - Smooth)",
    "aura-2-aries-en":     "Aries (M - Warm)",
    "aura-2-aurora-en":    "Aurora (F - Cheerful)",
    "aura-2-delia-en":     "Delia (F - Friendly)",
    "aura-2-electra-en":   "Electra (F - Professional)",
    "aura-2-harmonia-en":  "Harmonia (F - Empathetic)",
    "aura-2-helena-en":    "Helena (F - Caring)",
    "aura-2-hermes-en":    "Hermes (M - Professional)",
    "aura-2-hyperion-en":  "Hyperion (M - Empathetic)",
    "aura-2-juno-en":      "Juno (F - Melodic)",
    "aura-2-jupiter-en":   "Jupiter (M - Knowledgeable)",
    "aura-2-mars-en":      "Mars (M - Trustworthy)",
    "aura-2-neptune-en":   "Neptune (M - Polite)",
    "aura-2-ophelia-en":   "Ophelia (F - Enthusiastic)",
    "aura-2-orion-en":     "Orion (M - Polite)",
    "aura-2-orpheus-en":   "Orpheus (M - Trustworthy)",
    "aura-2-phoebe-en":    "Phoebe (F - Warm)",
    "aura-2-pluto-en":     "Pluto (M - Empathetic)",
    "aura-2-saturn-en":    "Saturn (M - Confident)",
    "aura-2-selene-en":    "Selene (F - Engaging)",
    "aura-2-theia-en":     "Theia (F - Sincere)",
    "aura-2-vesta-en":     "Vesta (F - Patient)"
}

@router.post("/generate-voice-previews")
async def generate_voice_previews():
    preview_script = "Hi, I'm your AI assistant from AIxcaller. How can I help you today?"
    
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
                        # 2. Convert to Base64 Data URI
                        audio_b64 = base64.b64encode(response.content).decode('utf-8')
                        data_uri = f"data:audio/mpeg;base64,{audio_b64}"
                        
                        # 3. Upsert into VoiceOption Table
                        statement = select(VoiceOption).where(VoiceOption.voice_id == voice_id)
                        voice_entry = session.exec(statement).first()
                        
                        if not voice_entry:
                            voice_entry = VoiceOption(
                                name=display_name,
                                voice_id=voice_id,
                                gender="Female" if " (F - " in display_name else "Male"
                            )
                        
                        voice_entry.preview_url = data_uri
                        session.add(voice_entry)
                        session.commit()
                        
                except Exception as e:
                    print(f"Error for {voice_id}: {e}")
                    
    return {"message": "Voice catalog updated with previews."}

@router.get("/voices")
async def get_voices(db: Session = Depends(get_db)):
    """Returns all available voices for the frontend dropdown."""
    statement = select(VoiceOption)
    voices = db.exec(statement).all()
    return voices
