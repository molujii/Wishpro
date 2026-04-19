# Module 4 — Text Model — Implementation Plan

## Context

Module 3 (Speech) is fully implemented with a `SpeechModuleService` that returns `SpeechRawTranscript`. The backend's `PipelineService` currently calls `MockTextService` in `app/main/services/textService.ts`, which just prefixes text with the mode name. Module 4 builds the real text-polishing module in `modules/text/` — a self-contained, provider-swappable LLM polishing module with mode-specific prompts, structured errors, a mock provider, an Ollama adapter scaffold, and safe fallback to raw text on failure.

The existing `modules/text/src/` skeleton (`index.ts` + `ollamaEngine.ts`) uses a different contract (`TextEngine.polish(rawText, PolishOptions)`) and must be replaced entirely to match the spec's `textService.polish(TextPolishRequest) → FinalTranscript | TextError` shape.

Module 4 does NOT wire the real text service into the backend pipeline — that bridge (`RealTextService` wrapping `TextModuleService`) is scaffolded here but the `app/main/services/textService.ts` mock remains unchanged.

---

## Target Folder Structure

```
modules/text/
├── src/
│   ├── index.ts              REWRITE — public API exports
│   ├── types.ts              CREATE — all shared types + isTextError guard
│   ├── prompts.ts            CREATE — mode-specific prompt templates
│   ├── textService.ts        CREATE — provider registry + error wrapping + fallback
│   └── providers/
│       ├── mockTextProvider.ts    CREATE — deterministic mock transforms per mode
│       └── ollamaProvider.ts      REPLACE ollamaEngine.ts — scaffold for Ollama HTTP API
└── tests/
    ├── mockTextProvider.test.ts   CREATE
    ├── ollamaProvider.test.ts     CREATE
    └── textService.test.ts        CREATE
```

**DELETE:** `modules/text/src/ollamaEngine.ts` (wrong contract, replaced by `ollamaProvider.ts`)

**DO NOT TOUCH:** `app/main/services/textService.ts`, `app/main/types/transcript.ts`, or any Module 2/3 files.

---

## Types (`modules/text/src/types.ts`)

```ts
import { SpeechRawTranscript } from '@modules/speech';

export type TextMode = 'conversation' | 'coding' | 'email' | 'custom';
export type EnhancementLevel = 'light' | 'normal' | 'heavy';
export type TextProviderName = 'mock' | 'ollama' | 'openai' | 'anthropic';

export interface TextPolishRequest {
  rawText: string;
  rawTranscript: SpeechRawTranscript;
  mode: TextMode;
  enhancementLevel?: EnhancementLevel;
}

export interface FinalTranscript {
  rawText: string;
  polishedText: string;
  mode: TextMode;
  confidence?: number;
  createdAt: string; // ISO-8601
}

export type TextErrorCode = 'PROVIDER_UNAVAILABLE' | 'POLISH_FAILED' | 'INVALID_INPUT';

export interface TextError {
  code: TextErrorCode;
  message: string;
  retryable: boolean;
}

export interface TextProvider {
  readonly name: TextProviderName;
  polish(request: TextPolishRequest): Promise<string>;
}

export function isTextError(result: FinalTranscript | TextError): result is TextError {
  return 'code' in result && 'retryable' in result;
}
```

---

## Prompts (`modules/text/src/prompts.ts`)

```ts
import { TextMode, EnhancementLevel } from './types';

export const MODE_PROMPTS: Record<TextMode, string> = {
  conversation: 'Clean up casual speech. Remove filler words (um, uh, like). Fix grammar. Keep the natural tone.',
  coding: 'Format as clean code comments or documentation. Use proper technical syntax and terminology.',
  email: 'Make professional. Fix grammar, improve clarity, use business tone. Keep it concise.',
  custom: 'Clean up and improve the text while preserving the original meaning.',
};

export const ENHANCEMENT_PREFIX: Record<EnhancementLevel, string> = {
  light: 'Make minimal corrections only. ',
  normal: '',
  heavy: 'Extensively rewrite for maximum clarity and professionalism. ',
};

export function buildPrompt(mode: TextMode, level: EnhancementLevel = 'normal'): string {
  return ENHANCEMENT_PREFIX[level] + MODE_PROMPTS[mode];
}
```

---

## Implementation Order

### Step 1 — `types.ts`
Full content shown above. All other files import from here.

### Step 2 — `prompts.ts`
Full content shown above. Pure data — no deps beyond types.

### Step 3 — `providers/mockTextProvider.ts`
Deterministic transformations per mode (no LLM call):

```ts
export class MockTextProvider implements TextProvider {
  readonly name: TextProviderName = 'mock';

  async polish(request: TextPolishRequest): Promise<string> {
    const { rawText, mode, enhancementLevel = 'normal' } = request;
    const prefix = enhancementLevel === 'light' ? '' : `[${mode}] `;

    switch (mode) {
      case 'conversation':
        // Remove filler words, capitalize first letter, add period
        return prefix + rawText
          .replace(/\b(um|uh|like|you know)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^./, c => c.toUpperCase())
          .replace(/([^.!?])$/, '$1.');
      case 'coding':
        return prefix + '// ' + rawText.trim();
      case 'email':
        return prefix + rawText.trim().replace(/^./, c => c.toUpperCase()) + '\n\nBest regards';
      case 'custom':
      default:
        return prefix + rawText.trim();
    }
  }
}
```

### Step 4 — `providers/ollamaProvider.ts`
Scaffold only — throws `'OllamaProvider is not yet implemented'`. Constructor accepts `baseUrl` and `model` so Phase 2 fills the body without changing call sites.

```ts
export class OllamaProvider implements TextProvider {
  readonly name: TextProviderName = 'ollama';
  constructor(
    private readonly baseUrl: string = 'http://localhost:11434',
    private readonly model: string = 'llama3'
  ) {}

  async polish(_request: TextPolishRequest): Promise<string> {
    throw new Error(`OllamaProvider(${this.model} @ ${this.baseUrl}) is not yet implemented`);
  }
}
```

### Step 5 — `textService.ts`

```ts
export class TextModuleService {
  constructor(private readonly provider: TextProvider) {}

  async polish(request: TextPolishRequest): Promise<FinalTranscript | TextError> {
    if (!request.rawText || !request.rawText.trim()) {
      return { code: 'INVALID_INPUT', message: 'rawText must be a non-empty string', retryable: false };
    }

    try {
      const polishedText = await this.provider.polish(request);
      return {
        rawText: request.rawText,
        polishedText,
        mode: request.mode,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      // Safe fallback: return raw text, never stall the pipeline
      return {
        rawText: request.rawText,
        polishedText: request.rawText,
        mode: request.mode,
        createdAt: new Date().toISOString(),
      };
    }
  }
}
```

**Error retryability rules:**
- `INVALID_INPUT` → `retryable: false` (caller's data is wrong)
- `PROVIDER_UNAVAILABLE` → `retryable: true` (Ollama not running, cloud down)
- `POLISH_FAILED` → `retryable: true` (transient failure)
- Provider throw → silent fallback to raw text (pipeline never stalls)

### Step 6 — `index.ts` (REWRITE)

```ts
export type {
  TextMode, EnhancementLevel, TextProviderName,
  TextPolishRequest, FinalTranscript,
  TextErrorCode, TextError, TextProvider,
} from './types';
export { isTextError } from './types';
export { TextModuleService } from './textService';
export { MockTextProvider } from './providers/mockTextProvider';
export { OllamaProvider } from './providers/ollamaProvider';
export { buildPrompt, MODE_PROMPTS } from './prompts';
```

---

## Tests

### `mockTextProvider.test.ts` — ~12 tests
- `provider.name === 'mock'`
- Conversation mode: removes filler words (um, uh), capitalizes first letter, adds period
- Coding mode: prefixes output with `// `
- Email mode: capitalizes + adds `Best regards` footer
- Custom mode: trims and returns text
- Enhancement level `light`: no mode prefix in output
- Enhancement level `heavy`: includes mode prefix
- Empty-ish string still returns a string (no throw)
- All four modes produce different outputs for the same input

### `ollamaProvider.test.ts` — ~3 tests
- `provider.name === 'ollama'`
- `polish()` rejects with `/not yet implemented/i`
- Construction with custom baseUrl + model doesn't throw

### `textService.test.ts` — ~12 tests
- Happy path: valid request → `FinalTranscript`, `isTextError` returns `false`
- `rawText` preserved in result
- `polishedText` differs from `rawText` (mock transformed it)
- `mode` preserved in result
- `createdAt` is valid ISO-8601
- Empty string → `INVALID_INPUT` error, `retryable: false`
- Whitespace-only string → `INVALID_INPUT`
- Provider throws → returns `FinalTranscript` with `polishedText === rawText` (fallback, no throw)
- All four modes produce `FinalTranscript` (not error)
- `isTextError` type guard: true for errors, false for transcripts
- `enhancementLevel` propagated to provider (spy assertion)

---

## Integration Bridge (NOT in Module 4 scope — scaffold comment only)

`app/main/services/textService.ts` will gain a `RealTextService` class in a future module:

```ts
// FUTURE (not Module 4)
export class RealTextService implements TextService {
  constructor(private readonly textModule: TextModuleService) {}

  async polishTranscript(input: RawTranscript, mode: AppMode): Promise<FinalTranscript> {
    const result = await this.textModule.polish({
      rawText: input.text,
      rawTranscript: { text: input.text, provider: 'mock', createdAt: input.createdAt },
      mode: mode as TextMode,
    });
    if (isTextError(result)) throw new Error(result.message);
    return {
      rawText: result.rawText,
      polishedText: result.polishedText,
      mode: result.mode as AppMode,
      language: input.language,
      createdAt: result.createdAt,
    };
  }
}
```

`MockTextService` and `FailingTextService` in Module 2 remain unchanged.

---

## Verification

```bash
# 1. TypeScript — whole project
npx tsc --noEmit

# 2. Text module tests only
npx jest --testPathPattern="modules/text" --verbose
# Expected: 3 suites, ~27 tests, all pass

# 3. Full test suite — confirm Modules 2 + 3 tests still pass
npx jest --verbose
# Expected: all main + renderer tests still green

# 4. Lint
npx eslint 'modules/text/**/*.ts'
# Expected: 0 errors
```

---

## File Change Summary

| File | Action |
|---|---|
| `modules/text/src/types.ts` | CREATE |
| `modules/text/src/prompts.ts` | CREATE |
| `modules/text/src/providers/mockTextProvider.ts` | CREATE |
| `modules/text/src/providers/ollamaProvider.ts` | CREATE |
| `modules/text/src/textService.ts` | CREATE |
| `modules/text/src/index.ts` | REWRITE |
| `modules/text/src/ollamaEngine.ts` | DELETE |
| `modules/text/tests/mockTextProvider.test.ts` | CREATE |
| `modules/text/tests/ollamaProvider.test.ts` | CREATE |
| `modules/text/tests/textService.test.ts` | CREATE |
