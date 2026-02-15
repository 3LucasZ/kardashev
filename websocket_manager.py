"""WebSocket connection manager."""

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        self.conn: WebSocket = None

    async def connect(self, websocket: WebSocket):
        """Accept and store WebSocket connection."""
        await websocket.accept()
        self.conn = websocket

    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection."""
        if self.conn == websocket:
            self.conn = None

    async def broadcast(self, message: dict):
        """Send message to connected client."""
        if self.conn:
            try:
                await self.conn.send_json(message)
            except Exception:
                pass
