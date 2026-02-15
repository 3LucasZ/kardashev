"""Game configuration and constants."""

import asyncio
from perplexity import Perplexity

# ==========================================
# LLM CONFIGURATION
# ==========================================

# Set to True to use local Ollama model instead of Perplexity API
MOCK_LLM = True

# Ollama settings (used when MOCK_LLM = True)
OLLAMA_CONFIG = {
    "base_url": "http://localhost:11434",
    "model": "llama3.1",
    "temperature": 0.3,
}

# ==========================================
# GAME CONFIGURATION
# ==========================================

GAME_CONFIG = {
    "MAX_DAYS": 5,
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

# Perplexity API client
client = Perplexity(
    api_key="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"
)

# Global queue for disaster inputs
disaster_queue = asyncio.Queue()
