from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
from loguru import logger

router = APIRouter(prefix="/api/v1/live", tags=["live"])

# Stores connected clients for each call: {call_id: [List of WebSockets]}
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, call_id: str):
        await websocket.accept()
        if call_id not in self.active_connections:
            self.active_connections[call_id] = []
        self.active_connections[call_id].append(websocket)
        logger.info(f"New viewer joined live stream for call: {call_id}")

    def disconnect(self, websocket: WebSocket, call_id: str):
        if call_id in self.active_connections:
            self.active_connections[call_id].remove(websocket)
            if not self.active_connections[call_id]:
                del self.active_connections[call_id]

    async def broadcast(self, message: dict, call_id: str):
        if call_id in self.active_connections:
            # Send to all dashboard viewers
            for connection in self.active_connections[call_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/live/{call_id}")
async def live_stream(websocket: WebSocket, call_id: str):
    await manager.connect(websocket, call_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, call_id)

@router.post("/update")
async def live_update(data: dict):
    """
    Relay endpoint: Voice Engine POSTs here, and we broadcast to all WebSockets.
    """
    call_id = data.get("call_id")
    if call_id:
        await manager.broadcast(data, call_id)
    return {"status": "broadcasted"}
