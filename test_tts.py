import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.environ.get("TELNYX_API_KEY")
print("Key starts with:", key[:5] if key else "None")

payload = {
    "model": "tts-1",
    "input": "Hello",
    "voice": "Telnyx.NaturalHD.astra"
}

res = requests.post("https://api.telnyx.com/v2/ai/audio/speech", 
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    json=payload)
print("/v2/ai/audio/speech", res.status_code, res.text)

res2 = requests.post("https://api.telnyx.com/v2/text-to-speech",
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    json={
        "text": "Hello",
        "voice": "Telnyx.NaturalHD.astra",
        "output_type": "binary_output"
    })
print("/v2/text-to-speech", res2.status_code, res2.text)
