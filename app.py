"""Main FastAPI application entry point."""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import MODELS
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
    - start: Begin all 3 simulations in parallel
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("command") == "start":
                # Start all 3 simulations in parallel
                asyncio.create_task(run_simulation("sonnet", MODELS["sonnet"], manager))
                asyncio.create_task(run_simulation("opus", MODELS["opus"], manager))
                asyncio.create_task(run_simulation("haiku", MODELS["haiku"], manager))

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
