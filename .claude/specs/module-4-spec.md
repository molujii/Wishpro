# Module 4 – Text Model – Spec

## 1. Purpose
Take raw speech transcript and polish it into final output using LLM. Supports different modes (Conversation, Coding, Email).

## 2. Scope
**In**: LLM provider interfaces, mock polishing, mode-based prompts, final transcript contract  
**Out**: Speech recognition, UI, backend orchestration, database persistence

## 3. User behavior
Raw transcript → Text Model polishes → final clean text displayed → user accepts or edits → clipboard insertion

## 4. Core requirements

### Interfaces
```ts
type TextMode = 'conversation' | 'coding' | 'email' | 'custom';
interface TextPolishRequest {
  rawText: string;
  rawTranscript: RawTranscript;  // from Module 3
  mode: TextMode;
  enhancementLevel?: 'light' | 'normal' | 'heavy';
}

interface FinalTranscript {
  rawText: string;
  polishedText: string;
  mode: TextMode;
  confidence?: number;
  createdAt: string;
}
```

### Functionality
1. `textService.polish(request)` → `FinalTranscript | TextError`
2. Mode-specific prompt templates
3. Mock LLM for development (deterministic transformations)
4. Provider abstraction (local Ollama/GPT4All first, cloud optional)
5. Enhancement levels (Raw/Light/Normal/Heavy)
6. Fallback to raw text on failure
7. Structured errors: `PROVIDER_UNAVAILABLE`, `POLLISH_FAILED`

### Provider strategy
- **Local-first**: Ollama, GPT4All, Llama.cpp
- **Cloud optional**: OpenAI, Anthropic (explicit opt-in)
- **Mock provider**: Grammar fixes, filler removal simulation

### Mode templates
```ts
const PROMPTS = {
  conversation: "Clean up casual speech. Remove filler words (um, uh). Fix grammar.",
  coding: "Format as clean code comments or documentation. Use proper syntax.",
  email: "Make professional. Fix grammar, improve clarity, business tone."
};
```

## 5. Backend contract
```ts
const polished = await textModel.polish({
  rawText: "hello how r u today umm",
  rawTranscript: { text: "...", provider: "whisper-cpp" },
  mode: "conversation"
});
// Returns: { polishedText: "Hello, how are you today?", mode: "conversation" }
```

## 6. Error handling
- Provider failure → return raw text with `polishedText = rawText`
- Network timeout → return raw text
- Invalid input → structured error
- Always safe fallback to prevent pipeline stall

## 7. Folder structure
modules/text/
├── index.ts
├── types.ts
├── providers/
│ ├── mockTextProvider.ts
│ └── ollamaProvider.ts
├── textService.ts
├── prompts.ts
└── tests/

text

## 8. Testing
- Mock provider transforms input correctly per mode
- Fallback returns raw text on failure
- Different modes produce different outputs
- Backend integration test

## 9. Definition of done
- Backend can call text service successfully
- Mock polishing works for all modes
- Raw text fallback implemented
- Tests pass for success/failure paths
- Prompt templates defined
- Local LLM adapter scaffolded