"""Disaster system for applying catastrophic events."""

import asyncio
import random
from llm import call_llm, extract_json


async def interpret_disaster(disaster_text: str, game_states: dict, model: str) -> dict:
    """
    Use LLM to interpret a natural disaster text and determine effects.

    Args:
        disaster_text: Natural language description of disaster
        game_states: Dictionary of current game states for all models
        model: Model ID to use for interpretation

    Returns:
        Dictionary with disaster effects for each model
    """

    # Aggregate game state for all models
    state_summary = {}
    for model_name, state in game_states.items():
        alive_agents = [aid for aid, data in state.get(
            "agents", {}).items() if data.get("alive", False)]
        state_summary[model_name] = {
            "population": len(alive_agents),
            "wild_fish": state.get("wild_fish", 0),
            "stash": state.get("village_stash", 0),
            "day": state.get("day", 0),
        }

    prompt = f"""
    You are a disaster interpreter for a fishing village survival game.

    Disaster Description: "{disaster_text}"

    Current Game State (3 parallel simulations):
    {state_summary}

    Your task: Interpret this disaster and determine realistic consequences for EACH model simulation.

    Available effects (reasonable based on disaster severity, only pick effects that make sense for the given disaster):
    - kill_agents: Number of agents to kill (maximum: 3)
    - destroy_stash: Fish to remove from village storage (maximum: 10)
    - destroy_wild_fish: Fish to remove from ocean (maximum: 10)
    - fish_growth_penalty: Reduce fish growth rate for N days (maximum: 4)

    Consider:
    - Disaster severity (mild, moderate, severe, catastrophic)
    - Logical consequences (mercury spill = kill ocean fish, fire = destroy stash, plague = kill agents)
    - Game balance (don't make it impossible to recover)
    - Each model should get SIMILAR effects (slight variations are OK)

    OUTPUT JSON (provide effects for all 3 models):
    {{
        "disaster_name": "short name (e.g., 'Mercury Spill')",
        "description": "one sentence describing what happened",
        "effects": {{
            "sonnet": {{
                "kill_agents": 1,
                "destroy_stash": 1,
                "destroy_wild_fish": 1,
                "fish_growth_penalty": 1
            }},
            "opus": {{
                "kill_agents": 1,
                "destroy_stash": 1,
                "destroy_wild_fish": 1,
                "fish_growth_penalty": 1
            }},
            "haiku": {{
                "kill_agents": 1,
                "destroy_stash": 1,
                "destroy_wild_fish": 1,
                "fish_growth_penalty": 1
            }}
        }}
    }}
    """

    response = await call_llm(prompt, model)
    return extract_json(response)


async def apply_disaster_effects(model_name: str, state: dict, effects: dict, manager) -> None:
    """
    Apply disaster effects to a specific model's game state.

    Args:
        model_name: Name of the model (sonnet/opus/haiku)
        state: Game state dictionary
        effects: Effects dictionary from interpret_disaster
        manager: WebSocket manager for broadcasting
    """

    # Kill agents
    kill_count = effects.get("kill_agents", 0)
    if kill_count > 0:
        alive_agents = [aid for aid,
                        data in state["agents"].items() if data["alive"]]
        victims = random.sample(alive_agents, min(
            kill_count, len(alive_agents)))
        for victim in victims:
            state["agents"][victim]["alive"] = False
            await manager.broadcast({
                "type": "DIE",
                "id": victim,
                "model": model_name
            })
            await manager.broadcast({
                "type": "LOG",
                "text": f"💀 {victim} perished in the disaster!",
                "model": model_name
            })

    # Destroy stash
    stash_loss = effects.get("destroy_stash", 0)
    if stash_loss > 0:
        stash_loss = min(stash_loss, state["village_stash"])
        state["village_stash"] -= stash_loss
        await manager.broadcast({
            "type": "LOG",
            "text": f"🔥 Lost {stash_loss} fish from village stash!",
            "model": model_name
        })

    # Destroy wild fish
    wild_loss = effects.get("destroy_wild_fish", 0)
    if wild_loss > 0:
        wild_loss = min(wild_loss, state["wild_fish"])
        state["wild_fish"] -= wild_loss
        await manager.broadcast({
            "type": "LOG",
            "text": f"🐟 {wild_loss} wild fish died in the ocean!",
            "model": model_name
        })

    # Apply fish growth penalty
    penalty_days = effects.get("fish_growth_penalty", 0)
    if penalty_days > 0:
        state["fish_growth_penalty"] = penalty_days
        await manager.broadcast({
            "type": "LOG",
            "text": f"⚠️ Fish growth reduced for {penalty_days} days!",
            "model": model_name
        })

    # Update stats
    await manager.broadcast({
        "type": "UPDATE_STATS",
        "day": state["day"],
        "wild": state["wild_fish"],
        "stash": state["village_stash"],
        "model": model_name
    })
