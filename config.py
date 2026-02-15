import asyncio
from anthropic import Anthropic

MODELS = {
    "sonnet": "claude-sonnet-4-5-20250929",
    "opus": "claude-opus-4-5-20251101",
    "haiku": "claude-haiku-4-5-20251001",
}

GAME_CONFIG = {
    "MAX_DAYS": 10,
    "STARTING_WILD_FISH": 30,
    "STARTING_STASH": 0,
    "FISH_GROWTH_RATE": 0.25,
    "INITIAL_AGENT_COUNT": 5,
    "AGENT_SKILL_RANGE": (2, 5),
    "FOOD_PER_AGENT": 1,
    "AGENT_NAMES": [
        "Anne", "Bob", "Carl", "Dana", "Eli", "Finn", "Grace", "Hank",
        "Iris", "Jack", "Kara", "Leo", "Mia", "Ned", "Ora", "Pete",
        "Quinn", "Rosa", "Sam", "Tara", "Uma", "Vera", "Wade", "Xena",
        "Yuri", "Zara"
    ],
}

client = Anthropic(
    api_key="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")

MOCK_LLM = False
OLLAMA_CONFIG = {
    "base_url": "http://localhost:11434",
    "model": "llama3.1",  # Change to your preferred model
    "temperature": 0.3,
}

disaster_queue = asyncio.Queue()
