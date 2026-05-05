import os
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from google.cloud import storage
import httpx
from typing import List
from sqlmodel import Session, select
from shared.database import engine, get_db
from shared.models import VoiceOption

router = APIRouter(prefix="/admin", tags=["admin"])

# List of approved Aura-2 voices
APPROVED_VOICES = [
    "aura-asteria-en", "aura-luna-en", "aura-stella-en", "aura-athena-en", "aura-hera-en",
    "aura-orpheus-en", "aura-helios-en", "aura-zeus-en", "aura-apollo-en", "aura-orion-en",
    "aura-arcas-en", "aura-perseus-en", "aura-angus-en"
]

@router.post("/generate-voice-previews")
async def generate_voice_previews():
    gcs_client = storage.Client()
    bucket = gcs_client.bucket(os.getenv("GCS_BUCKET_NAME", "aixcaller-assets"))
    preview_script = "Hi, I'm your AI assistant from AIxcaller. How can I help you today?"
    
    async with httpx.AsyncClient() as client:
        with Session(engine) as session:
            for voice_id in APPROVED_VOICES:
                try:
                    # 1. Call Deepgram TTS
                    response = await client.post(
                        f"https://api.deepgram.com/v1/speak?model={voice_id}",
                        headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
                        json={"text": preview_script}
                    )
                    
                    if response.status_code == 200:
                        # 2. Upload to GCS
                        blob = bucket.blob(f"previews/{voice_id}.mp3")
                        blob.upload_from_string(response.content, content_type="audio/mpeg")
                        blob.make_public()
                        
                        # 3. Upsert into VoiceOption Table
                        statement = select(VoiceOption).where(VoiceOption.voice_id == voice_id)
                        voice_entry = session.exec(statement).first()
                        
                        if not voice_entry:
                            voice_name = voice_id.split("-")[1].capitalize()
                            voice_entry = VoiceOption(
                                name=voice_name,
                                voice_id=voice_id,
                                gender="Female" if "asteria" in voice_id or "luna" in voice_id else "Male"
                            )
                        
                        voice_entry.preview_url = blob.public_url
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
