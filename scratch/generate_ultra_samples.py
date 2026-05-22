#!/usr/bin/env python
import os
import sys
import httpx
from loguru import logger

# Try loading from .env if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TELNYX_VOICES = [
    {"voice_id": "Telnyx.Ultra.Grace",    "name": "Grace",    "gender": "Female", "style": "Professional / Warm"},
    {"voice_id": "Telnyx.Ultra.George",   "name": "George",   "gender": "Male",   "style": "Professional / Confident"},
    {"voice_id": "Telnyx.Ultra.Ava",      "name": "Ava",      "gender": "Female", "style": "Friendly / Bright"},
    {"voice_id": "Telnyx.Ultra.James",    "name": "James",    "gender": "Male",   "style": "Calm / Authoritative"},
    {"voice_id": "Telnyx.Ultra.Emma",     "name": "Emma",     "gender": "Female", "style": "Empathetic / Sincere"},
    {"voice_id": "Telnyx.Ultra.Daniel",   "name": "Daniel",   "gender": "Male",   "style": "Warm / Trustworthy"},
    {"voice_id": "Telnyx.Ultra.Allie",    "name": "Allie",    "gender": "Female", "style": "Friendly / Expressive"},
    {"voice_id": "Telnyx.Ultra.Benji",    "name": "Benji",    "gender": "Male",   "style": "Playful / High-energy"},
    {"voice_id": "Telnyx.Ultra.Ronald",   "name": "Ronald",   "gender": "Male",   "style": "Mature / Reassuring"},
    {"voice_id": "Telnyx.Ultra.Wesley",   "name": "Wesley",   "gender": "Male",   "style": "Clean / Clear"},
    {"voice_id": "Telnyx.Ultra.Mia",      "name": "Mia",      "gender": "Female", "style": "Direct / Business"},
    {"voice_id": "Telnyx.Ultra.Howard",   "name": "Howard",   "gender": "Male",   "style": "Deep / Narrative"},
    {"voice_id": "Telnyx.Ultra.Harry",    "name": "Harry",    "gender": "Male",   "style": "Youthful / Casual"},
    {"voice_id": "Telnyx.Ultra.Jasper",   "name": "Jasper",   "gender": "Male",   "style": "Smooth / Conversational"},
    {"voice_id": "Telnyx.Ultra.Arvin",    "name": "Arvin",    "gender": "Male",   "style": "Energetic / Direct"},
    {"voice_id": "Telnyx.Ultra.Callie",   "name": "Callie",   "gender": "Female", "style": "Bright / Engaging"},
    {"voice_id": "Telnyx.Ultra.Skyler",   "name": "Skyler",   "gender": "Female", "style": "Natural / Conversational"},
    {"voice_id": "Telnyx.Ultra.Darius",   "name": "Darius",   "gender": "Male",   "style": "Professional / Grounded"},
    {"voice_id": "Telnyx.Ultra.Kelsey",   "name": "Kelsey",   "gender": "Female", "style": "Soft / Gentle"},
]

def generate_and_upload():
    telnyx_api_key = os.environ.get("TELNYX_API_KEY")
    if not telnyx_api_key:
        logger.error("Error: TELNYX_API_KEY is not set in environment variables.")
        sys.exit(1)
        
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "aixcaller-assets")
    logger.info(f"Using GCS Bucket: {bucket_name}")
    
    try:
        from google.cloud import storage
        gcs_client = storage.Client()
    except Exception as e:
        logger.error(f"Failed to initialize GCS Client: {e}")
        logger.error("Please make sure GOOGLE_APPLICATION_CREDENTIALS is set or you are authenticated.")
        sys.exit(1)
        
    bucket = gcs_client.bucket(bucket_name)
    if not bucket.exists():
        logger.error(f"Bucket '{bucket_name}' does not exist!")
        sys.exit(1)
        
    success_count = 0
    failure_count = 0
    
    for voice in TELNYX_VOICES:
        v_id = voice["voice_id"]
        v_name = voice["name"]
        logger.info(f"Synthesizing preview for {v_name} ({v_id})...")
        
        # Simple high-quality preview text
        text = f"Hello! I am {v_name}, one of the ultra premium voices provided by Telnyx. I am ready to be used for your AI voice assistant."
        
        url = "https://api.telnyx.com/v2/text-to-speech"
        headers = {
            "Authorization": f"Bearer {telnyx_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "voice": v_id,
            "output_type": "binary_output"
        }
        
        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code != 200:
                logger.error(f"Telnyx TTS synthesis failed for {v_name} with status {response.status_code}: {response.text}")
                failure_count += 1
                continue
                
            audio_bytes = response.content
            blob_name = f"voices/telnyx_ultra_{v_name.lower()}.mp3"
            blob = bucket.blob(blob_name)
            
            logger.info(f"Uploading {blob_name} to GCS...")
            blob.upload_from_string(audio_bytes, content_type="audio/mpeg")
            
            try:
                blob.make_public()
                public_url = blob.public_url
            except Exception as e:
                logger.warning(f"Could not make {blob_name} public (Uniform Bucket Level Access active): {e}")
                public_url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
                
            logger.success(f"Successfully generated and uploaded preview for {v_name}! Public URL: {public_url}")
            success_count += 1
            
        except Exception as e:
            logger.error(f"Exception synthesizing/uploading preview for {v_name}: {e}")
            failure_count += 1
            
    logger.info("========================================")
    logger.info(f"Previews Generation Complete: {success_count} succeeded, {failure_count} failed.")
    logger.info("========================================")

if __name__ == "__main__":
    generate_and_upload()
