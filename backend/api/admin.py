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

# List of approved Aura-2 voices
APPROVED_VOICES = {
    "aura-asteria-en": "Asteria (Female - Professional)",
    "aura-luna-en":    "Luna (Female - Soft)",
    "aura-stella-en":  "Stella (Female - Upbeat)",
    "aura-athena-en":  "Athena (Female - Calm)",
    "aura-hera-en":    "Hera (Female - Mature)",
    "aura-maeda-en":   "Maeda (Female - Friendly)",
    "aura-orion-en":   "Orion (Male - Authoritative)",
    "aura-arcas-en":   "Arcas (Male - Deep)",
    "aura-perseus-en": "Perseus (Male - Casual)",
    "aura-angus-en":   "Angus (Male - Friendly)",
    "aura-orpheus-en": "Orpheus (Male - Resonant)",
    "aura-helios-en":  "Helios (Male - Warm)",
    "aura-zeus-en":    "Zeus (Male - Powerful)"
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
                                gender="Female" if "Female" in display_name else "Male"
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
