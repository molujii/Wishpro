# Module 3 – Speech Model – Spec

## 1. Purpose
Convert audio to raw text transcript using modular ASR providers. Backend orchestrates; this module executes ASR.

## 2. Scope
**In scope**: Provider interfaces, mock ASR, Whisper adapter, transcript contracts, validation  
**Out of scope**: UI, full backend orchestration, text polishing, persistence

## 3. User behavior
User releases mic button → audio sent to speech model → raw transcript returned → backend handles next steps.

## 4. Core requirements

### Interfaces
```ts
type SpeechProviderName = 'mock' | 'whisper-cpp' | 'whisper-python' | 'cloud-whisper';
interface SpeechRequest {
  audioFilePath: string;
  language?: string;
  timeoutMs?: number;
}
interface RawTranscript {
  text: string;
  language?: string;
  durationMs?: number;
  confidence?: number;
  provider: SpeechProviderName;
  createdAt: string;
}
```

### Functionality
1. `speechService.transcribe(request)` → `RawTranscript | SpeechError`
2. Mock provider for development (deterministic output)
3. Input validation (file exists, supported format)
4. Provider registry pattern
5. Language support (explicit or auto-detect)
6. Timeout handling
7. Structured errors: `INVALID_INPUT`, `TIMEOUT`, `PROVIDER_FAILED`

### Provider design
- **Local-first**: Whisper.cpp or Python wrapper preferred[web:1]
- **Cloud optional**: Explicit opt-in only[web:1]
- **Extensible**: Easy to add Parakeet, other engines later[web:1]

## 5. Error handling
Return typed errors with `retryable: boolean` flag. Log technical details, emit safe UI messages.

## 6. Backend contract
```ts
const result = await speechModel.transcribe({
  audioFilePath: '/tmp/audio.wav',
  language: 'en',
  timeoutMs: 30000
});
```

## 7. Folder structure
modules/speech/
├── index.ts
├── types.ts
├── providers/
│ ├── mockSpeechProvider.ts
│ └── whisperAdapter.ts
├── speechService.ts
└── tests/


## 8. Testing
- Mock provider success/failure
- Invalid input validation
- Timeout handling
- Backend integration smoke test

## 9. Definition of done
- Backend can call speech service and get mock transcript
- Input validation works
- Structured errors returned
- Tests pass
- Whisper adapter scaffolded (real integration later)
- Language parameter preserved