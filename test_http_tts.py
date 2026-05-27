import os
import requests
import re

env_content = open(".env.cloudrun.example").read()
key = re.search(r'TELNYX_API_KEY=(.+)', env_content).group(1)

urls = [
    "https://api.telnyx.com/v2/ai/openai/v1/audio/speech",
    "https://api.telnyx.com/v2/ai/openai/audio/speech",
    "https://api.telnyx.com/v2/ai/audio/speech",
    "https://api.telnyx.com/v2/audio/speech",
    "https://api.telnyx.com/v2/text-to-speech/speech",
]

payload = {
    "model": "telnyx",
    "voice": "Telnyx.Ultra.Grace",
    "input": "Hello, testing Ultra voice."
}
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

for url in urls:
    print(f"Testing {url}...")
    try:
        r = requests.post(url, headers=headers, json=payload)
        print("  -> Status:", r.status_code)
        if r.status_code != 404:
            print("  -> Body:", r.text[:200])
    except Exception as e:
        print("  -> Exception:", e)

