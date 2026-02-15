import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import MODELS
from websocket_manager import ConnectionManager
from game import run_simulation
from disaster import interpret_disaster, apply_disaster_effects

app = FastAPI()
manager = ConnectionManager()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Track game states globally so disasters can access them
game_states = {
    "sonnet": {},
    "opus": {},
    "haiku": {}
}


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
                    "sonnet", MODELS["sonnet"], manager, game_states))
                asyncio.create_task(run_simulation(
                    "opus", MODELS["opus"], manager, game_states))
                asyncio.create_task(run_simulation(
                    "haiku", MODELS["haiku"], manager, game_states))

            elif msg.get("command") == "disaster":
                # Handle disaster
                disaster_text = msg.get("text", "")
                if disaster_text:
                    asyncio.create_task(handle_disaster(disaster_text))

    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def handle_disaster(disaster_text: str):
    """Process and apply a disaster across all simulations."""
    try:
        # Use first available model for interpretation
        interpret_model = MODELS["sonnet"]

        # Interpret the disaster
        disaster_data = await interpret_disaster(disaster_text, game_states, interpret_model)

        if not disaster_data or "effects" not in disaster_data:
            await manager.broadcast({
                "type": "LOG",
                "text": f"⚠️ Failed to interpret disaster: {disaster_text}",
                "model": "sonnet"
            })
            return

        disaster_name = disaster_data.get("disaster_name", "Unknown Disaster")
        description = disaster_data.get("description", "A disaster has occurred!")
        effects = disaster_data.get("effects", {})

        # Apply effects to each model
        for model_name in ["sonnet", "opus", "haiku"]:
            if model_name in effects and model_name in game_states:
                # Broadcast disaster event
                await manager.broadcast({
                    "type": "DISASTER",
                    "disaster_name": disaster_name,
                    "description": description,
                    "model": model_name
                })

                # Apply effects
                await apply_disaster_effects(
                    model_name,
                    game_states[model_name],
                    effects[model_name],
                    manager
                )

    except Exception as e:
        print(f"Error handling disaster: {e}")
        await manager.broadcast({
            "type": "LOG",
            "text": f"⚠️ Error processing disaster: {str(e)}",
            "model": "sonnet"
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        timeout_graceful_shutdown=2
    )
