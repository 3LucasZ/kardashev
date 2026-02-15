# Mock LLM Setup Guide

Use a local LLM instead of the Perplexity API for testing and development.

## Why Use Mock LLM?

- ✅ **Free** - No API costs during development
- ✅ **Fast** - No network latency, optimized for M3
- ✅ **Offline** - Works without internet
- ✅ **Rate limit free** - Test as much as you want
- ✅ **Privacy** - All data stays local

## Quick Setup (5 minutes)

### 1. Install Ollama

Download and install Ollama for Mac:
```bash
# Visit https://ollama.ai/download or use:
brew install ollama
```

### 2. Download a Model

Pull a lightweight model (recommended for M3 with 64GB):
```bash
# Fast 3B model (1.9GB) - Recommended
ollama pull llama3.2:3b

# OR Medium 8B model (4.7GB) - Better quality
ollama pull llama3.2:8b

# OR Larger 13B model (7.4GB) - Best quality
ollama pull llama3.1:13b
```

### 3. Start Ollama Server

```bash
ollama serve
```

Keep this terminal open. Ollama will run at `http://localhost:11434`

### 4. Enable Mock Mode

Edit `config.py`:
```python
# Change this line from False to True
MOCK_LLM = True
```

### 5. Run the Game

```bash
python app.py
```

That's it! The game will now use your local model instead of the API.

## Configuration

In `config.py`, you can customize the Ollama settings:

```python
OLLAMA_CONFIG = {
    "base_url": "http://localhost:11434",
    "model": "llama3.2:3b",  # Change to your preferred model
    "temperature": 0.7,      # 0.0 = deterministic, 1.0 = creative
}
```

## Recommended Models for M3 64GB

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama3.2:3b` | 1.9GB | ⚡⚡⚡ | ⭐⭐ | Fast testing |
| `llama3.2:8b` | 4.7GB | ⚡⚡ | ⭐⭐⭐ | Balanced |
| `llama3.1:13b` | 7.4GB | ⚡ | ⭐⭐⭐⭐ | Best quality |
| `qwen2.5:14b` | 9GB | ⚡ | ⭐⭐⭐⭐ | Excellent reasoning |

## Performance Tips

### Speed Optimization
```bash
# Use quantized models for faster inference
ollama pull llama3.2:3b-q4_0  # 4-bit quantization
```

### Memory Management
```bash
# Check GPU memory usage
ollama ps

# Stop running models to free memory
ollama stop llama3.2:3b
```

### Multiple Models
```bash
# Switch models in config.py without re-downloading
ollama list  # See installed models
```

## Troubleshooting

### "Cannot connect to Ollama"
```bash
# Make sure Ollama is running
ollama serve

# Check if port 11434 is in use
lsof -i :11434
```

### "Model not found"
```bash
# List available models
ollama list

# Pull the model if missing
ollama pull llama3.2:3b
```

### Slow inference
```bash
# Use a smaller model
ollama pull llama3.2:3b

# Or use quantized version
ollama pull llama3.2:3b-q4_0
```

### JSON parsing errors
The local model might not always return valid JSON. You can:
1. Use a larger model (better instruction following)
2. Adjust temperature in `config.py` (lower = more consistent)
3. Add more explicit JSON instructions in prompts

## Switching Back to API

Just set `MOCK_LLM = False` in `config.py`:
```python
MOCK_LLM = False  # Use Perplexity API
```

## Model Comparison

### API (Perplexity)
- ✅ Highest quality responses
- ✅ No local setup needed
- ❌ Costs money per request
- ❌ Rate limited
- ❌ Requires internet

### Local (Ollama)
- ✅ Completely free
- ✅ No rate limits
- ✅ Works offline
- ✅ Fast on M3
- ❌ Slightly lower quality
- ❌ Initial setup required

## Advanced: Custom Models

You can use any Ollama-compatible model:

```python
OLLAMA_CONFIG = {
    "model": "mistral:7b",      # Mistral 7B
    # OR
    "model": "codellama:13b",   # Code-focused
    # OR
    "model": "phi3:mini",       # Microsoft's Phi-3
}
```

Browse all models: https://ollama.ai/library

## Performance Benchmarks (M3 64GB)

| Model | Tokens/sec | Response Time | Memory |
|-------|-----------|---------------|--------|
| llama3.2:3b | ~60-80 | 1-2s | 2GB |
| llama3.2:8b | ~35-50 | 2-4s | 5GB |
| llama3.1:13b | ~25-35 | 4-6s | 8GB |

*Times are approximate for typical game responses*

## Need Help?

Check Ollama documentation: https://github.com/ollama/ollama
