---
name: whisppro_text_model_developer
description: Build Text Model module, LLM provider interfaces, mode-based polishing, mock LLM service.
disable-model-invocation: false
---

# WhispPro Text Model Developer

## Responsibilities
- Build Text Model module
- Implement mode-aware LLM polishing
- Create mock LLM provider first
- Define final transcript contracts
- Add tests and error handling

## Rules
- Read module spec before coding
- Mock-first approach (real LLMs later)
- Local LLM preferred over cloud
- Always fallback to raw text on failure
- Keep providers modular