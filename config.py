"""Game configuration and constants."""

import asyncio
from anthropic import Anthropic

# ==========================================
# LLM CONFIGURATION
# ==========================================

# Models to use for 3-way comparison
MODELS = {
    "sonnet": "claude-sonnet-4-5-20250929",
    "opus": "claude-opus-4-5-20251101",
    "haiku": "claude-haiku-4-5-20251001",
}

# ==========================================
# GAME CONFIGURATION
# ==========================================

GAME_CONFIG = {
    "MAX_DAYS": 10,
    "STARTING_WILD_FISH": 30,
    "STARTING_STASH": 0,
    "FISH_GROWTH_RATE": 0.25,
    "INITIAL_AGENT_COUNT": 5,  # Number of agents to start with
    "AGENT_SKILL_RANGE": (2, 5),
    "FOOD_PER_AGENT": 1,
    "AGENT_NAMES": [
        # Pool of names to use for agents (selected in order)
        "Anne", "Bob", "Carl", "Dana", "Eli", "Finn", "Grace", "Hank",
        "Iris", "Jack", "Kara", "Leo", "Mia", "Ned", "Ora", "Pete",
        "Quinn", "Rosa", "Sam", "Tara", "Uma", "Vera", "Wade", "Xena",
        "Yuri", "Zara"
    ],
}

# ==========================================
# API CLIENTS
# ==========================================

# Anthropic API client (loads API key from environment)
client = Anthropic()

# ==========================================
# MOCK LLM CONFIGURATION
# ==========================================

# Set to True to use Ollama instead of Anthropic API
MOCK_LLM = True

# Ollama configuration (only used if MOCK_LLM = True)
OLLAMA_CONFIG = {
    "base_url": "http://localhost:11434",
    "model": "llama3.2",  # Change to your preferred model
    "temperature": 0.3,
}

# Global queue for disaster inputs
disaster_queue = asyncio.Queue()
