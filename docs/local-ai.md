# Local AI Integration Guide

Riskeez supports local AI inference via **Ollama**, ensuring your data never leaves your infrastructure.

## How it Works

The Riskeez backend communicates with the Ollama service via standard REST APIs. This allows for:
- Zero data leakage to public LLM providers.
- Reduced latency for high-volume analysis.
- Cost savings by using existing on-premise compute.

## Configuration

In your `.env` or container environment variables, set the following:

- `AI_PROVIDER=ollama`
- `OLLAMA_BASE_URL=http://ollama:11434`
- `OLLAMA_MODEL=llama3.1` (Recommended for balance of performance and accuracy)

## Mock Fallback

If `MOCK_AI_FALLBACK_ENABLED=true`, the system will use heuristic-based mock responses if the Ollama service is unreachable, preventing application crashes during downtime.

## Privacy Considerations

- All processing is local to the container network.
- Models do not "learn" from your data during inference (frozen weights).
- Audit logs track which model generated which finding.

## Limitations of AI Output

- LLMs can experience "hallucinations" (confident incorrectness).
- Output is determined by the quality of the prompt and the model size.
- Smaller models (e.g., Llama 3 8B) may struggle with extremely complex cross-mapping tasks.

## Professional Advice Disclaimer

Riskeez AI Advisor provides **synthesized reasoning only**. It does not constitute legal, regulatory, or professional risk advice. All AI-generated findings must be reviewed by a human expert.
