import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import MODELS
from websocket_manager import ConnectionManager
from game import run_simulation

app = FastAPI()
manager = ConnectionManager()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def get():
    return FileResponse("index.html")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("command") == "start":
                # Start all 3 simulations in parallel
                asyncio.create_task(run_simulation(
                    "sonnet", MODELS["sonnet"], manager))
                asyncio.create_task(run_simulation(
                    "opus", MODELS["opus"], manager))
                asyncio.create_task(run_simulation(
                    "haiku", MODELS["haiku"], manager))

    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        timeout_graceful_shutdown=2
    )
