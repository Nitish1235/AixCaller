import os
import asyncio
import websockets
import json
import re
import base64

env_content = open(".env.cloudrun.example").read()
key = re.search(r'TELNYX_API_KEY=(.+)', env_content).group(1)

async def test_ws():
    uri = "wss://api.telnyx.com/v2/text-to-speech/speech?voice=Telnyx.Ultra.Grace"
    headers = {"Authorization": f"Bearer {key}"}
    try:
        print("Connecting...")
        async with websockets.connect(uri, additional_headers=headers) as websocket:
            print("Connected. Sending init frame")
            await websocket.send(" ")
            await asyncio.sleep(0.5)
            print("Sending text frame")
            await websocket.send("Hello! I am Grace, one of the ultra premium voices provided by Telnyx.")
            await websocket.send("") # End stream
            
            audio_bytes = bytearray()
            print("Waiting for audio frames...")
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    if isinstance(message, str):
                        data = json.loads(message)
                        if data.get("type") == "audio":
                            audio_bytes.extend(base64.b64decode(data["data"]))
                        elif data.get("type") == "end":
                            break
                    else:
                        print("Got raw bytes?", len(message))
                except asyncio.TimeoutError:
                    print("Timeout waiting for more frames")
                    break
            
            print("Total audio bytes received:", len(audio_bytes))
    except Exception as e:
        print("Error:", e)

asyncio.run(test_ws())
