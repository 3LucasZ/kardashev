"""Main FastAPI application entry point."""

import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import disaster_queue
from websocket_manager import ConnectionManager
from game import run_simulation

# ==========================================
# FASTAPI APP
# ==========================================
app = FastAPI()
manager = ConnectionManager()

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")


# ==========================================
# ROUTES
# ==========================================
@app.get("/")
async def get():
    """Serve the main HTML page."""
    return FileResponse("index.html")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time game communication.

    Handles:
    - start: Begin the simulation
    - disaster: Add a disaster to the queue
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("command") == "start":
                await run_simulation(manager)
            elif msg.get("command") == "disaster":
                await disaster_queue.put(msg.get("text"))

    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ==========================================
# MAIN
# ==========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        timeout_graceful_shutdown=2
    )
