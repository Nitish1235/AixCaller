import os
import asyncio
import websockets
from dotenv import load_dotenv

load_dotenv("backend/.env.cloudrun.example")
# Just using a mock key to see if we get a 401 or a connection.
key = os.environ.get("TELNYX_API_KEY")

async def test_ws():
    uri = "wss://api.telnyx.com/v2/text-to-speech/speech?voice=Telnyx.Ultra.Grace"
    headers = {"Authorization": f"Bearer {key}"}
    try:
        async with websockets.connect(uri, additional_headers=headers) as websocket:
            await websocket.send(" ")
            await websocket.send("Hello")
            await websocket.send("")
            
            while True:
                message = await websocket.recv()
                print("Received bytes:", len(message))
    except Exception as e:
        print("Error:", e)

asyncio.run(test_ws())
