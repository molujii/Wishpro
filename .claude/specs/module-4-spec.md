# Module 4 – Text Model Spec

## Purpose
Optional LLM polish layer applied after raw transcription.

## Requirements
- TextEngine interface: polish(rawText, options) → string
- OllamaEngine: local HTTP call to Ollama
- CloudEngine: OpenAI / Claude API calls
- Mode-aware system prompts (Conversation, Coding, Email)
- Can be disabled (passthrough mode)

## Definition of Done
- [ ] OllamaEngine calls local model and returns polished text
- [ ] Mode prompts tested
- [ ] Passthrough (none) mode works
