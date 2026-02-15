# Game 3 - Fishing Village Simulation

A single-threaded multiplayer survival simulation where AI agents vote democratically on fishing, reproduction, and resource distribution decisions.

## Project Structure

```
game_3/
├── app.py                      # Main FastAPI application and routes
├── config.py                   # Game configuration and API client setup
├── llm.py                      # LLM interaction and voting functions
├── websocket_manager.py        # WebSocket connection management
├── game.py                     # Core game simulation and disaster logic
├── index.html                  # Clean HTML structure
├── static/                     # Frontend assets
│   ├── css/
│   │   └── style.css          # All styling (pixel art theme)
│   └── js/
│       ├── game.js            # Canvas rendering & game loop
│       ├── charts.js          # Data visualization
│       ├── ui.js              # UI interactions & dialogue
│       └── websocket.js       # Server communication
├── app_old.py                 # Backup of original backend
└── index_old.html             # Backup of original monolithic HTML
```

## Backend Files

### `app.py`
Main entry point for the application. Contains:
- FastAPI app initialization
- HTTP route for serving index.html
- WebSocket endpoint for real-time communication
- Main execution block with uvicorn configuration

### `config.py`
Configuration and shared state. Contains:
- `GAME_CONFIG`: Game parameters (days, fish, agents, etc.)
- `client`: Perplexity API client instance
- `disaster_queue`: Async queue for disaster events

### `llm.py`
LLM interaction layer. Contains:
- `call_llm()`: Async LLM calls running in thread pool (allows Ctrl+C interruption)
- `extract_json()`: Parse JSON from LLM responses
- `get_vote()`: Get a single vote from an agent
- `gather_votes()`: Collect votes sequentially from multiple agents

### `websocket_manager.py`
WebSocket management. Contains:
- `ConnectionManager`: Class for handling WebSocket connections
  - `connect()`: Accept new connections
  - `disconnect()`: Remove connections
  - `broadcast()`: Send messages to connected clients

### `game.py`
Game simulation logic. Contains:
- `process_disaster()`: Handle natural language disaster events
- `run_simulation()`: Main game loop with three phases:
  1. **Fishing Phase**: Vote on and execute fishing
  2. **Reproduction Phase**: Vote on adding new agents
  3. **Rationing Phase**: Vote on food distribution

## Frontend Files

### `index.html`
Clean HTML structure with semantic sections:
- Game canvas container
- Chart panels (wild fish, stash, population)
- Sidebar (controls, stats, dialogue feed)
- Links to external CSS and JavaScript modules

### `static/css/style.css`
Pixel art themed styling:
- Responsive layout with flexbox
- Retro VT323 font
- Animated dialogue messages
- Color-coded agent avatars
- Chart styling and hover effects

### `static/js/sprite-loader.js`
Sprite image loader:
- Loads pixel art images (built-in or custom)
- Generates sprites as data URLs
- Animated sprite support
- Automatic fallback to programmatic drawing

### `static/js/game.js`
Canvas rendering engine:
- Renders actual sprite images
- Sprite definitions (player, fish, tree, skull)
- Pixel-perfect rendering
- Agent movement and animations
- Island generation
- Fire particles and visual effects

### `static/js/charts.js`
Data visualization:
- Line charts with filled areas
- Real-time data updates
- Auto-scaling axes
- Grid lines and labels
- Three separate charts (wild fish, stash, population)

### `static/js/ui.js`
User interface interactions:
- Dialogue message rendering
- Speech bubble management
- Start button and disaster input
- Scrolling and animations
- Avatar and nametag display

### `static/js/websocket.js`
Server communication:
- WebSocket connection management
- Event routing and handling
- Game state synchronization
- Real-time updates from server

## Architecture

### Single-Threaded Design
- All LLM calls run in thread pool via `asyncio.to_thread()`
- Allows event loop to process Ctrl+C interrupts
- Sequential vote collection (no parallel API calls)
- `await asyncio.sleep(0)` in main loop for responsiveness

### Signal Handling
- Uvicorn handles SIGINT (Ctrl+C) by default
- 2-second graceful shutdown timeout
- Simulation catches `asyncio.CancelledError` for clean interruption

### Communication Flow
```
Client (Browser)
    ↓ WebSocket
FastAPI (app.py)
    ↓
ConnectionManager (websocket_manager.py)
    ↓ broadcasts
Game Simulation (game.py)
    ↓ calls
LLM Functions (llm.py)
    ↓ uses
Config & API Client (config.py)
```

## Running the Game

```bash
python app.py
```

Then open http://localhost:8000 in your browser.

## Development

### Modifying the Game
- **Game rules**: Edit `game.py` (phases, voting logic)
- **LLM prompts**: Edit prompts in `game.py`
- **Configuration**: Edit `GAME_CONFIG` in `config.py`
  - `INITIAL_AGENT_COUNT`: Number of starting agents
  - `AGENT_NAMES`: Pool of names to use for agents
  - `MAX_DAYS`: Game duration
  - `STARTING_WILD_FISH`: Initial fish population
  - `FISH_GROWTH_RATE`: Daily fish growth percentage
- **API settings**: Edit client setup in `config.py`
- **WebSocket protocol**: Edit `app.py` websocket endpoint
- **Frontend**: Edit files in `static/css/` and `static/js/`

### Testing with Local LLM (Free & Fast)

Instead of using the Perplexity API during development, you can use a local model:

```bash
# 1. Install Ollama
brew install ollama

# 2. Pull a model
ollama pull llama3.2:3b

# 3. Start Ollama
ollama serve

# 4. Enable mock mode in config.py
MOCK_LLM = True
```

See [MOCK_LLM_SETUP.md](MOCK_LLM_SETUP.md) for detailed setup instructions.

## Features

- ✅ Single-threaded execution (no race conditions)
- ✅ Interruptible LLM calls (Ctrl+C works anytime)
- ✅ Natural language disaster system
- ✅ Democratic voting system for all decisions
- ✅ Real-time UI updates via WebSocket
- ✅ Graceful error handling and recovery
- ✅ **Mock LLM mode** - Use local models for free testing (see [MOCK_LLM_SETUP.md](MOCK_LLM_SETUP.md))
- ✅ **Pixel art sprites** - Actual sprite images with animation support (see [SPRITES.md](SPRITES.md))
