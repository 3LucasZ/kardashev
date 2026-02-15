"""LLM interaction and voting functions."""

import asyncio
import json
import re
import httpx
from config import client, MOCK_LLM, OLLAMA_CONFIG


def _blocking_llm_call(prompt: str, model: str) -> str:
    """Blocking LLM call - runs in thread pool."""
    # Prepend instruction for JSON-only output
    prompt = "Your output MUST only consist of a JSON with no extra text.\n" + prompt

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _blocking_ollama_call(prompt: str) -> str:
    """Blocking Ollama call - runs in thread pool."""
    # Prepend instruction for JSON-only output
    prompt = "Your output MUST only consist of a JSON with no extra text.\n" + prompt

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{OLLAMA_CONFIG['base_url']}/api/generate",
                json={
                    "model": OLLAMA_CONFIG["model"],
                    "prompt": prompt,
                    "temperature": OLLAMA_CONFIG["temperature"],
                    "stream": False,
                }
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
    except Exception as e:
        print(f"Ollama Error: {e}")
        # Return a fallback JSON response
        return '{"vote": "YES", "say": "I agree."}'


async def call_llm(prompt: str, model: str = None, personality: str | None = None) -> str:
    """
    Call LLM with error handling. Runs in thread pool to allow interrupts.

    Args:
        prompt: The prompt to send
        model: Claude model ID to use (ignored if MOCK_LLM=True)
        personality: Optional personality prefix

    Returns:
        LLM response text
    """
    if personality:
        prompt = f"You are a {personality} agent.\n{prompt}"

    try:
        # Route to appropriate LLM based on configuration
        if MOCK_LLM:
            # Use Ollama
            response_text = await asyncio.to_thread(_blocking_ollama_call, prompt)
        else:
            # Use Anthropic API
            response_text = await asyncio.to_thread(_blocking_llm_call, prompt, model)
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
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = text[start:end]
            return json.loads(json_str)
        return {}
    except json.JSONDecodeError:
        # Try to clean up common JSON issues
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = text[start:end]
                # Remove trailing commas
                cleaned = re.sub(r",\s*([}\]])", r"\1", json_str)
                # Fix unquoted keys (common LLM mistake)
                cleaned = re.sub(r'(\w+):', r'"\1":', cleaned)
                return json.loads(cleaned)
        except Exception:
            pass
        return {}
    except Exception:
        return {}


async def get_vote(voter: str, prompt: str, model: str) -> tuple[str, str, str]:
    """
    Get a vote response from LLM.

    Returns:
        Tuple of (vote, reason, say)
    """
    res = await call_llm(prompt, model)
    data = extract_json(res)
    vote = data.get("vote", "NO").upper() if data else "NO"
    reason = data.get("justification", "...")
    say = data.get("say", f"{vote}!")
    return vote, reason, say


async def gather_votes(voters: list[str], make_prompt, model: str) -> dict[str, tuple[str, str, str]]:
    """
    Collect votes in parallel from all voters.
    Handles errors gracefully.

    Args:
        voters: List of voter IDs
        make_prompt: Function that takes voter ID and returns prompt
        model: Claude model ID to use

    Returns:
        Dictionary mapping voter ID to (vote, reason, say) tuple
    """
    tasks = {voter: get_vote(voter, make_prompt(voter), model) for voter in voters}
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    output = {}
    for voter, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            # Fallback on error — default to YES to avoid deadlock
            output[voter] = ("YES", "error fallback", "I'll go along with it.")
        else:
            output[voter] = result
    return output
