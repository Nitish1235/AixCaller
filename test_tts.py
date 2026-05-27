import os
import requests
import re

env_content = open("backend/.env.cloudrun.example").read()
key = re.search(r'TELNYX_API_KEY=(.+)', env_content).group(1)

url = "https://api.telnyx.com/v2/text-to-speech"
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
payload = {"text": "hello", "voice": "Grace", "output_type": "binary_output"}

r = requests.post(url, headers=headers, json=payload)
print(r.status_code, r.text[:200])

payload = {"text": "hello", "voice": "telnyx.ultra.grace", "output_type": "binary_output"}
r = requests.post(url, headers=headers, json=payload)
print(r.status_code, r.text[:200])

