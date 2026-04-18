# Module 3 — Speech Model — Implementation Plan

## Context

Module 2 (Backend/IPC) is fully implemented with a `MockSpeechService` that returns hardcoded text. Module 3 builds the real ASR provider layer in `modules/speech/` — a self-contained, provider-swappable speech transcription module with input validation, structured errors, a mock provider, and a Whisper adapter scaffold. The existing `modules/speech/src/` skeleton uses a wrong contract (`audioBuffer: Buffer` instead of `audioFilePath: string`) and must be replaced entirely.

Module 3 does NOT yet wire mic capture to the pipeline — that bridge (a `RealSpeechService` wrapping `SpeechModuleService`) is scaffolded here but implemented when native audio capture is ready.

---

## Target Folder Structure

```
modules/speech/
├── src/
│   ├── index.ts                          REWRITE — public API exports
│   ├── types.ts                          CREATE — all shared types + isSpeechError guard
│   ├── validation.ts                     CREATE — input validation (file exists, format, timeout)
│   ├── speechService.ts                  CREATE — provider registry + timeout + error wrapping
│   └── providers/
│       ├── mockSpeechProvider.ts         CREATE — deterministic mock, supports injected delay
│       └── whisperAdapter.ts             CREATE — scaffold for whisper.cpp subprocess (Phase 2)
└── tests/
    ├── validation.test.ts                CREATE
    ├── mockSpeechProvider.test.ts        CREATE
    ├── whisperAdapter.test.ts            CREATE
    └── speechService.test.ts             CREATE
```

**DELETE:** `modules/speech/src/whisperEngine.ts` (wrong contract, replaced by `whisperAdapter.ts`)

**DO NOT TOUCH:** `app/main/services/speechService.ts`, `app/main/types/transcript.ts`, or any Module 2 files.

---

## Types (`modules/speech/src/types.ts`)

```ts
export type SpeechProviderName = 'mock' | 'whisper-cpp' | 'whisper-python' | 'cloud-whisper';

export interface SpeechRequest {
  audioFilePath: string;
  language?: string;
  timeoutMs?: number;
}

export interface SpeechRawTranscript {
  text: string;
  language?: string;
  durationMs?: number;
  confidence?: number;
  provider: SpeechProviderName;
  createdAt: string; // ISO-8601
}

export type SpeechErrorCode = 'INVALID_INPUT' | 'TIMEOUT' | 'PROVIDER_FAILED';

export interface SpeechError {
  code: SpeechErrorCode;
  message: string;
  retryable: boolean;
}

export interface SpeechProvider {
  readonly name: SpeechProviderName;
  transcribe(request: SpeechRequest): Promise<SpeechRawTranscript>;
}

export function isSpeechError(result: SpeechRawTranscript | SpeechError): result is SpeechError {
  return 'code' in result && 'retryable' in result;
}
```

---

## Implementation Order

Dependencies flow top-to-bottom — implement in this exact order.

### Step 1 — `types.ts` (no deps)
Full content shown above. All other files import from here.

### Step 2 — `validation.ts`
Uses Node `fs` + `path`. Validates:
1. `audioFilePath` — non-empty string
2. Extension — must be in `{.wav, .mp3, .m4a, .ogg, .flac, .webm}`
3. File existence — `fs.existsSync(audioFilePath)`
4. `timeoutMs` — if provided, must be a positive number

Returns `SpeechError | null`. Synchronous (called before the async provider call).

```ts
import fs from 'fs';
import path from 'path';
import { SpeechRequest, SpeechError } from './types';

const SUPPORTED_EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.webm']);

export function validateSpeechRequest(request: SpeechRequest): SpeechError | null { ... }
```

### Step 3 — `providers/mockSpeechProvider.ts`
```ts
export class MockSpeechProvider implements SpeechProvider {
  readonly name: SpeechProviderName = 'mock';
  constructor(private readonly delayMs: number = 0) {} // delayMs enables timeout testing

  async transcribe(request: SpeechRequest): Promise<SpeechRawTranscript> {
    // optional await delay, then return:
    // { text: 'Mock transcript from speech module', language: request.language ?? 'en',
    //   durationMs: 1500, confidence: 0.95, provider: 'mock', createdAt: new Date().toISOString() }
  }
}
```

### Step 4 — `providers/whisperAdapter.ts`
Scaffold only — throws `'WhisperAdapter is not yet implemented'`. Constructor accepts `modelPath` and `execPath` so Phase 2 fills the body without changing call sites.

```ts
export class WhisperAdapter implements SpeechProvider {
  readonly name: SpeechProviderName = 'whisper-cpp';
  constructor(private readonly modelPath: string, private readonly execPath = 'whisper-cpp') {}
  async transcribe(_request: SpeechRequest): Promise<SpeechRawTranscript> {
    throw new Error(`WhisperAdapter(${this.execPath}) is not yet implemented. Model: ${this.modelPath}`);
  }
}
```

### Step 5 — `speechService.ts`
```ts
export class SpeechModuleService {
  constructor(private readonly provider: SpeechProvider) {}

  async transcribe(request: SpeechRequest): Promise<SpeechRawTranscript | SpeechError> {
    const validationError = validateSpeechRequest(request);
    if (validationError) return validationError;

    if (request.timeoutMs) return this.transcribeWithTimeout(request, request.timeoutMs);
    return this.callProvider(request);
  }

  private async transcribeWithTimeout(request, timeoutMs): Promise<...> {
    // Promise.race(callProvider(request), timeout(timeoutMs → TIMEOUT error))
  }

  private async callProvider(request): Promise<...> {
    try { return await this.provider.transcribe(request); }
    catch (err) { return { code: 'PROVIDER_FAILED', message: err.message, retryable: true }; }
  }
}
```

**Error retryability rules:**
- `INVALID_INPUT` → `retryable: false` (caller's data is wrong)
- `PROVIDER_FAILED` → `retryable: true` (transient subprocess/model failure)
- `TIMEOUT` → `retryable: true` (might succeed with shorter audio)

### Step 6 — `index.ts` (REWRITE)
```ts
export type { SpeechProviderName, SpeechRequest, SpeechRawTranscript,
              SpeechErrorCode, SpeechError, SpeechProvider } from './types';
export { isSpeechError } from './types';
export { SpeechModuleService } from './speechService';
export { MockSpeechProvider } from './providers/mockSpeechProvider';
export { WhisperAdapter } from './providers/whisperAdapter';
export { validateSpeechRequest } from './validation';
```

---

## Tests

All test files create real temp `.wav` files in `os.tmpdir()` (to satisfy `fs.existsSync`) and clean up in `afterAll`.

### `validation.test.ts` — ~9 tests
- Valid `.wav` file → `null`
- Empty string, whitespace-only → `INVALID_INPUT`
- `.txt` extension → `INVALID_INPUT` (message matches `/unsupported audio format/i`)
- Non-existent path → `INVALID_INPUT` (message matches `/not found/i`)
- `timeoutMs: 0`, `timeoutMs: -500` → `INVALID_INPUT`
- `timeoutMs: 5000` → `null`
- All supported extensions (`.mp3`, `.m4a`, `.ogg`, `.flac`, `.webm`) → `null`

### `mockSpeechProvider.test.ts` — ~8 tests
- `provider.name === 'mock'`
- Returns non-empty `text`
- Preserves `language` from request; defaults to `'en'`
- `createdAt` is valid ISO-8601 (between `before` and `after` timestamps)
- `durationMs` is a positive number
- `confidence` is between 0 and 1
- `provider` field equals `'mock'`

### `whisperAdapter.test.ts` — ~3 tests
- `adapter.name === 'whisper-cpp'`
- `transcribe()` rejects with `/not yet implemented/i`
- Construction with custom `execPath` doesn't throw

### `speechService.test.ts` — ~10 tests
- Happy path: valid request → `SpeechRawTranscript`, `isSpeechError` returns `false`
- Language preserved through provider
- Missing file → `INVALID_INPUT` error returned (no throw)
- Unsupported format → `INVALID_INPUT`
- Validation failure → `provider.transcribe` NOT called (spy assertion)
- Provider throws → `PROVIDER_FAILED` error, `retryable: true`, message propagated
- Slow provider (`delayMs: 500`) + `timeoutMs: 50` → `TIMEOUT`, `retryable: true`
- Fast provider + `timeoutMs: 5000` → transcript returned
- `isSpeechError` type guard: true for errors, false for transcripts

---

## Integration Bridge (NOT in Module 3 scope — scaffold comment only)

`app/main/services/speechService.ts` will gain a `RealSpeechService` class in a future module when mic capture is wired:

```ts
// FUTURE (not Module 3)
export class RealSpeechService implements SpeechService {
  constructor(private readonly speechModule: SpeechModuleService) {}

  async startCapture(): Promise<void> {
    // Start native mic recording to a temp .wav file
  }

  async stopCaptureAndTranscribe(): Promise<RawTranscript> {
    // Stop recording → call speechModule.transcribe({ audioFilePath })
    // Map SpeechRawTranscript → RawTranscript (drop confidence + provider fields)
    // If isSpeechError(result) → throw new Error(result.message) for PipelineService to catch
  }
}
```

`MockSpeechService` and `FailingSpeechService` in Module 2 remain unchanged.

---

## Verification

```bash
# 1. TypeScript — whole project (catches import errors across module boundary)
npx tsc --noEmit

# 2. Speech module tests only
npx jest --testPathPattern="modules/speech" --verbose
# Expected: 4 suites, ~30 tests, all pass

# 3. Full test suite — confirm Module 2 tests still pass
npx jest --verbose
# Expected: all main + renderer tests still green

# 4. Lint
npx eslint 'modules/speech/**/*.ts'
# Expected: 0 errors
```

---

## File Change Summary

| File | Action |
|---|---|
| `modules/speech/src/types.ts` | CREATE |
| `modules/speech/src/validation.ts` | CREATE |
| `modules/speech/src/providers/mockSpeechProvider.ts` | CREATE |
| `modules/speech/src/providers/whisperAdapter.ts` | CREATE |
| `modules/speech/src/speechService.ts` | CREATE |
| `modules/speech/src/index.ts` | REWRITE |
| `modules/speech/src/whisperEngine.ts` | DELETE |
| `modules/speech/tests/validation.test.ts` | CREATE |
| `modules/speech/tests/mockSpeechProvider.test.ts` | CREATE |
| `modules/speech/tests/whisperAdapter.test.ts` | CREATE |
| `modules/speech/tests/speechService.test.ts` | CREATE |
