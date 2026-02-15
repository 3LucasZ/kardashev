#!/usr/bin/env python3
"""
Test script for mock LLM functionality.

Usage:
    python test_mock_llm.py
"""

import asyncio
import sys


async def test_mock_llm():
    """Test that the mock LLM is working correctly."""
    print("=" * 60)
    print("Mock LLM Test")
    print("=" * 60)

    # Import after banner to catch import errors
    from config import MOCK_LLM, OLLAMA_CONFIG
    from llm import call_llm, extract_json

    # Show configuration
    print(f"\n📋 Configuration:")
    print(f"   MOCK_LLM: {MOCK_LLM}")
    if MOCK_LLM:
        print(f"   Model: {OLLAMA_CONFIG['model']}")
        print(f"   Base URL: {OLLAMA_CONFIG['base_url']}")
        print(f"   Temperature: {OLLAMA_CONFIG['temperature']}")
    else:
        print("   Using Perplexity API")

    if not MOCK_LLM:
        print("\n⚠️  MOCK_LLM is False. Set it to True in config.py to test mock mode.")
        return False

    # Test 1: Basic call
    print("\n" + "=" * 60)
    print("Test 1: Basic LLM Call")
    print("=" * 60)

    try:
        response = await call_llm("Say hello in one short sentence.")
        print(f"✅ Response received: {response[:100]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # Test 2: JSON extraction
    print("\n" + "=" * 60)
    print("Test 2: JSON Response")
    print("=" * 60)

    try:
        prompt = """
        You are a game agent. Respond with JSON only.
        OUTPUT JSON: { "vote": "YES", "say": "I agree!" }
        """
        response = await call_llm(prompt)
        data = extract_json(response)
        print(f"✅ Parsed JSON: {data}")

        if "vote" in data or "say" in data:
            print("✅ JSON contains expected keys")
        else:
            print("⚠️  JSON might not contain expected keys")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # Test 3: Personality prefix
    print("\n" + "=" * 60)
    print("Test 3: Personality Prefix")
    print("=" * 60)

    try:
        response = await call_llm(
            "Introduce yourself in one sentence.",
            personality="pirate captain"
        )
        print(f"✅ Response with personality: {response[:100]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print("\nYour mock LLM is working correctly. You can now run the game with:")
    print("   python app.py")
    print()

    return True


async def main():
    """Run tests and exit with appropriate code."""
    try:
        success = await test_mock_llm()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
