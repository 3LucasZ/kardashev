"""LLM interaction and voting functions."""

import asyncio
import json
import re
import requests
from config import client, MOCK_LLM, OLLAMA_CONFIG


def _blocking_llm_call(prompt: str) -> str:
    """Blocking LLM call - runs in thread pool."""
    if MOCK_LLM:
        # Use local Ollama model
        return _ollama_call(prompt)
    else:
        # Use Perplexity API
        response = client.responses.create(
            model="perplexity/sonar",
            input=prompt,
        )
        return response.output_text


def _ollama_call(prompt: str) -> str:
    """
    Call local Ollama model.

    Requires Ollama to be running: `ollama serve`
    Install: https://ollama.ai/download
    """
    try:
        response = requests.post(
            f"{OLLAMA_CONFIG['base_url']}/api/generate",
            json={
                "model": OLLAMA_CONFIG["model"],
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": OLLAMA_CONFIG["temperature"],
                }
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()["response"]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(
            f"Cannot connect to Ollama at {OLLAMA_CONFIG['base_url']}. "
            f"Make sure Ollama is running: `ollama serve`"
        )
    except Exception as e:
        raise RuntimeError(f"Ollama error: {e}")


async def call_llm(prompt: str, personality: str | None = None) -> str:
    """
    Call LLM with error handling. Runs in thread pool to allow interrupts.

    Uses local Ollama model if MOCK_LLM=True, otherwise uses Perplexity API.

    Args:
        prompt: The prompt to send
        personality: Optional personality prefix

    Returns:
        LLM response text
    """
    if personality:
        prompt = f"You are a {personality} agent.\n{prompt}"

    try:
        model_name = f"Ollama ({OLLAMA_CONFIG['model']})" if MOCK_LLM else "Perplexity (sonar)"
        print(f"[{model_name}] LLM Prompt:\n{prompt}\n---")

        # Run blocking call in thread pool so event loop can process interrupts
        response_text = await asyncio.to_thread(_blocking_llm_call, prompt)

        print(f"[{model_name}] LLM Response:\n{response_text}\n---")
        return response_text
    except asyncio.CancelledError:
        print("LLM call cancelled")
        raise
    except Exception as e:
        print(f"LLM Error: {e}")
        return "Error: Unable to get response"


def extract_json(text: str) -> dict:
    """Extract JSON from LLM response text."""
    try:
        text = text.replace("```json", "").replace("```", "")
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(text[start:end])
        return {}
    except Exception:
        try:
            cleaned = re.sub(r",\s*([}\]])", r"\1", text.strip())
            return json.loads(cleaned)
        except Exception:
            return {}


async def get_vote(prompt: str) -> tuple[str, str, str]:
    """
    Get a vote response from LLM.

    Returns:
        Tuple of (vote, reason, say)
    """
    res = await call_llm(prompt)
    data = extract_json(res)
    vote = data.get("vote", "NO").upper() if data else "NO"
    reason = data.get("justification", "...")
    say = data.get("say", f"{vote}!")
    return vote, reason, say


async def gather_votes(voters: list[str], make_prompt) -> dict[str, tuple[str, str, str]]:
    """
    Collect votes sequentially from all voters.
    Handles errors gracefully.

    Args:
        voters: List of voter IDs
        make_prompt: Function that takes voter ID and returns prompt

    Returns:
        Dictionary mapping voter ID to (vote, reason, say) tuple
    """
    output = {}
    for voter in voters:
        try:
            result = await get_vote(make_prompt(voter))
            output[voter] = result
        except Exception as e:
            print(f"Error getting vote from {voter}: {e}")
            output[voter] = ("YES", "error fallback", "I'll go along with it.")
    return output
