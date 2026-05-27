import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.environ.get("TELNYX_API_KEY")

url = "https://api.telnyx.com/v2/ai/embeddings/embed-documents"
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

print("Test 1: Empty payload")
r1 = requests.post(url, headers=headers, json={})
print(r1.status_code, r1.text)

print("Test 2: Bad auth")
r2 = requests.post(url, headers={"Authorization": "Bearer BAD", "Content-Type": "application/json"}, json={})
print(r2.status_code, r2.text)

print("Test 3: POST /v2/ai/embeddings with empty payload (to compare)")
r3 = requests.post("https://api.telnyx.com/v2/ai/embeddings", headers=headers, json={})
print(r3.status_code, r3.text)
