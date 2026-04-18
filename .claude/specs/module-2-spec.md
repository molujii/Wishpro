# Module 2 – Backend / Logic – Spec

## 1. Purpose

This module implements the core backend and orchestration layer of WhispPro.

It is responsible for:
- Running the Electron main process
- Managing application lifecycle and window creation
- Handling IPC between frontend and backend
- Coordinating the voice transcription pipeline
- Managing hotkeys, app state, and service wiring
- Acting as the control plane between UI, Speech Model, Text Model, and Database modules

This module is the “brain” of the desktop app. The frontend should remain mostly presentation-focused, while this backend module coordinates actions, workflows, status updates, and system-level integrations.[file:1]

---

## 2. Scope

### In scope

- Electron main process setup
- App bootstrap and BrowserWindow lifecycle
- IPC request/response and event channels
- Backend application state management
- Global hotkey registration (initial implementation or stub)
- Audio workflow orchestration hooks
- Integration contracts for:
  - Speech Model module
  - Text Model module
  - Database module
  - Authentication/config module
- Pipeline state transitions:
  - idle
  - listening
  - transcribing
  - polishing
  - completed
  - error
- Error handling and structured logging
- Frontend state notifications from backend
- Development-safe mock mode for speech/text pipeline

### Out of scope

- Actual ASR model implementation logic
- Actual LLM provider implementation
- Actual DB persistence implementation
- Real OAuth/login flows
- Packaging, CI/CD, deployment concerns
- Final security hardening of secrets storage

Those belong to other modules and should be referenced only through interfaces and contracts in this module.

---

## 3. Module objective

By the end of Module 2, the app should support a complete end-to-end mocked backend flow:

1. Frontend sends “mic start”
2. Backend updates state to `listening`
3. Frontend sends “mic stop`
4. Backend invokes a mocked Speech service
5. Backend receives raw transcript
6. Backend invokes a mocked Text service
7. Backend receives polished transcript
8. Backend emits final result to frontend
9. Backend optionally forwards transcript for later DB persistence integration

This module should prove the architecture works even before real model integration is implemented.

---

## 4. User-facing behavior

Although this is a backend-focused module, it directly affects visible app behavior.

### Expected visible flow

- When the user presses and holds the mic button, the backend transitions to `listening`.
- When the user releases the mic button, the backend transitions to `transcribing`.
- After the mocked speech service returns text, backend transitions to `polishing`.
- After the mocked text service finishes, backend transitions to `completed`.
- The final transcript is emitted to the frontend for preview or insertion.
- If anything fails, backend transitions to `error` and provides a safe, human-readable error message.

### UI coordination requirements

The backend must support frontend updates for:
- status label
- listening state
- loading indicators
- transcript preview
- error banner/toast
- active mode selection

Frontend updates may evolve in future modules, so this backend must expose clear event-driven state changes rather than tightly coupling logic into UI behavior.

---

## 5. Functional requirements

### 5.1 Electron app lifecycle

1. The backend must initialize the Electron app and create the primary application window.
2. The backend must load the renderer entry point in both development and production modes.
3. The backend must handle standard Electron lifecycle events:
   - `app.whenReady()`
   - `window-all-closed`
   - `activate`
4. The backend must support clean startup and shutdown.
5. The backend must prepare for future tray/menu integration, even if not implemented yet.

### 5.2 IPC architecture

6. The backend must expose structured IPC channels for communication with the frontend.
7. IPC must be organized by domain and naming convention.
8. Renderer-to-main requests must be validated at runtime where practical.
9. Main-to-renderer events must be predictable and documented.
10. IPC handlers must not contain business logic directly; they should delegate to services/controllers.

### 5.3 Application state orchestration

11. The backend must maintain a central in-memory application state for current session behavior.
12. The backend must track at least:
   - current mode
   - current status
   - whether app is listening
   - whether a pipeline run is active
   - latest transcript
   - latest error
13. The backend must prevent invalid transitions where possible.
14. The backend must reject duplicate or conflicting requests, such as starting a new recording while one is already running.
15. The backend must emit state changes to the renderer.

### 5.4 Hotkey support

16. The backend must provide a hotkey registration mechanism using Electron global shortcuts or an equivalent abstraction.
17. The first implementation may use a default shortcut or stub.
18. Hotkey press/release behavior should be designed to match press-to-talk usage.
19. Hotkey logic must be abstracted so it can later be made configurable via Settings.
20. If hotkey registration fails, the app must continue to function via on-screen controls.

### 5.5 Pipeline orchestration

21. The backend must orchestrate the following logical pipeline:

   `capture start -> capture stop -> speech transcription -> text polishing -> result emit`

22. The backend must call the Speech Model module through an interface, not direct implementation-specific code.
23. The backend must call the Text Model module through an interface, not direct implementation-specific code.
24. The backend must allow the Text Model step to be optional in future versions.
25. The backend must support mode-aware processing (e.g. Conversation, Coding, Custom).
26. The backend must support passing metadata such as language, timestamps, and mode through the pipeline.

### 5.6 Mock development mode

27. The backend must support a mock pipeline mode for development.
28. In mock mode, speech transcription returns deterministic fake text.
29. In mock mode, text polishing returns a deterministic transformed version of the text.
30. Mock mode must be easy to enable in local development and tests.
31. Mock mode must behave similarly to real orchestration so frontend behavior can be tested early.

### 5.7 Logging and errors

32. The backend must provide structured logs for major events:
   - app startup
   - window creation
   - IPC receipt
   - status transitions
   - speech start/finish
   - text polish start/finish
   - errors
33. Errors must be captured with technical details for logs and safe messages for UI.
34. The backend must avoid crashing the app for recoverable errors.
35. Failed pipeline runs must reset the system to a stable state.

---

## 6. Non-functional requirements

### Performance

- Status changes should feel immediate to the user.
- IPC events should be lightweight and not block the UI.
- Mock pipeline round-trip should complete quickly for developer feedback.
- The module should be designed so that long-running speech/text tasks can be offloaded without freezing Electron.

### Reliability

- The backend should remain operational even if one module fails.
- The system should recover cleanly after failed runs.
- Window lifecycle and IPC handlers should not create duplicate registrations.

### Maintainability

- Backend architecture must be modular and interface-first.
- No model-specific or DB-specific logic should leak into unrelated files.
- Service contracts must be explicit and typed.
- Each responsibility should live in a clearly named file/module.

### Security

- Renderer should not have unrestricted Node access.
- Use Electron security best practices such as preload-mediated APIs and context isolation in later integration.
- Sensitive configuration should not be hardcoded.
- Backend should prepare for secure secrets handling in future auth/config module.[file:1]

### Beginner-friendliness

- File naming and folder structure must be easy to understand.
- Logic should be broken into small, readable services.
- Avoid overly clever abstractions in v1.
- Prefer explicit orchestration over hidden magic.

---

## 7. Assumptions

- Frontend/UI module exists or is in progress.
- Electron + React + TypeScript is the chosen stack.[file:1]
- Speech and Text modules will be plugged in later behind interfaces.
- SQLite persistence will be added later via Database module.[file:1]
- Mac-first development is acceptable, but architecture should remain cross-platform.[file:1]

---

## 8. Architecture responsibilities

This module should act as the orchestrator between all major modules.

### Module relationships

- **Module 1 Frontend/UI**
  - sends user actions to backend
  - receives state updates and transcript results

- **Module 3 Speech Model**
  - backend invokes it for raw transcription

- **Module 4 Text Model**
  - backend invokes it to polish transcript

- **Module 5 Database**
  - backend sends finalized transcript for persistence

- **Module 6 Authentication / Secure Config**
  - backend requests API keys or provider settings if cloud services are enabled

- **Module 7 CI/CD**
  - tests and validates backend build

- **Module 8 Packaging**
  - packages Electron main process and preload correctly

- **Module 9 Deployment**
  - depends on backend stability and packaging output

---

## 9. Proposed folder structure

The exact structure may evolve, but Module 2 should aim for something close to:

```text
app/
  main/
    main.ts
    window/
      createMainWindow.ts
    ipc/
      channels.ts
      registerIpcHandlers.ts
    controllers/
      transcriptionController.ts
      appStateController.ts
    services/
      speechService.ts
      textService.ts
      hotkeyService.ts
      pipelineService.ts
      logger.ts
    state/
      appState.ts
      stateMachine.ts
    types/
      ipc.ts
      transcript.ts
      mode.ts
      status.ts
    preload/
      index.ts
```

Optional future folders:
- `adapters/`
- `providers/`
- `config/`

---

## 10. Core backend concepts

### 10.1 App state

The backend should maintain a simple centralized state object.

Example fields:

```ts
type AppStatus =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'polishing'
  | 'completed'
  | 'error';

type AppMode = 'conversation' | 'coding' | 'custom';

interface BackendAppState {
  status: AppStatus;
  mode: AppMode;
  listening: boolean;
  pipelineActive: boolean;
  latestTranscript?: FinalTranscript;
  latestError?: string | null;
}
```

### 10.2 Transcript contracts

```ts
interface RawTranscript {
  text: string;
  language?: string;
  durationMs?: number;
  createdAt: string;
}

interface FinalTranscript {
  rawText: string;
  polishedText: string;
  mode: AppMode;
  language?: string;
  createdAt: string;
}
```

### 10.3 Service contracts

```ts
interface SpeechService {
  startCapture(): Promise<void>;
  stopCaptureAndTranscribe(): Promise<RawTranscript>;
}

interface TextService {
  polishTranscript(input: RawTranscript, mode: AppMode): Promise<FinalTranscript>;
}
```

The actual implementation can begin as mocked services.

---

## 11. IPC specification

### Renderer -> Main

Suggested channels:

- `ui:mic-start`
- `ui:mic-stop`
- `ui:mode-change`
- `ui:get-app-state`
- `ui:retry-last-run`
- `ui:cancel-current-run`

### Main -> Renderer

Suggested channels:

- `backend:status-change`
- `backend:state-sync`
- `backend:transcript-ready`
- `backend:error`
- `backend:log-event` (optional in development only)

### IPC payload examples

```ts
type ModeChangePayload = {
  mode: 'conversation' | 'coding' | 'custom';
};

type StatusChangePayload = {
  status: 'idle' | 'listening' | 'transcribing' | 'polishing' | 'completed' | 'error';
};

type TranscriptReadyPayload = {
  rawText: string;
  polishedText: string;
  mode: 'conversation' | 'coding' | 'custom';
  createdAt: string;
};
```

### IPC rules

- Payloads must be typed.
- Channels must be centralized in one file.
- Renderer should use preload-safe APIs instead of direct unrestricted IPC calls.
- IPC handlers should return normalized responses.

---

## 12. State machine expectations

This module should implement a simple, readable state flow.

### Valid transitions

- `idle -> listening`
- `listening -> transcribing`
- `transcribing -> polishing`
- `polishing -> completed`
- `completed -> idle`
- `any -> error`
- `error -> idle`

### Invalid transitions to block

- `listening -> listening`
- `transcribing -> listening`
- `polishing -> listening`
- starting a second run while `pipelineActive = true`

A formal state machine library is optional; a simple guarded transition layer is enough for v1.

---

## 13. Error handling expectations

The backend must classify errors into at least these groups:

- startup errors
- IPC validation errors
- hotkey registration errors
- speech pipeline errors
- text pipeline errors
- unknown internal errors

### Error handling rules

- Log the technical error
- Emit safe error message to UI
- Reset `pipelineActive`
- Return to `idle` or `error` state depending on severity
- Never leave app stuck in `transcribing` or `polishing`

Example safe UI messages:
- “Unable to start listening.”
- “Transcription failed. Please try again.”
- “Text polishing failed. Showing raw transcript instead.”

---

## 14. Logging requirements

A lightweight logger should be introduced in this module.

### Minimum log events

- app initialized
- main window created
- preload connected
- IPC channel invoked
- mic start received
- mic stop received
- speech service started
- speech service completed
- text service started
- text service completed
- transcript emitted
- error occurred

### Logging goals

- Help beginner debugging
- Make pipeline steps visible
- Support future production diagnostics
- Remain easy to disable or reduce in production

---

## 15. Frontend coordination requirements

Even though frontend is Module 1, Module 2 must be designed so frontend can evolve incrementally.

### Required coordination points

- UI should always be able to ask for current app state.
- UI should receive status updates without polling.
- UI should receive final transcript data after pipeline completion.
- UI should receive clear errors for display.
- UI should be able to reflect current selected mode.

### Frontend update note

This module is allowed to require small frontend updates if needed, such as:
- adding preload API calls
- wiring IPC listeners
- rendering returned transcript
- showing new status values

Any frontend changes triggered by Module 2 should be minimal, documented, and backward-compatible where possible.

---

## 16. Testing requirements

Module 2 should include backend-focused tests where practical.

### Minimum testing expectations

1. Unit tests for state transitions
2. Unit tests for pipeline orchestration in mock mode
3. Unit tests for IPC handler/controller logic where possible
4. Smoke test for app startup if practical
5. Tests for duplicate start prevention
6. Tests for fallback behavior on mocked service failure

### Example test cases

- Start from idle -> press mic -> state becomes listening
- Release mic -> speech mock returns transcript -> text mock returns polished text
- Error in speech mock -> state becomes error or idle with safe message
- Changing mode updates backend state
- Second start request during active pipeline is rejected

---

## 17. Developer experience requirements

Since this project is also a learning project, Module 2 must optimize for clarity.

### Rules

- Prefer explicit names like `startPipeline`, `emitStatusChange`, `registerMainIpcHandlers`
- Keep files small and single-purpose
- Avoid mixing Electron bootstrapping with transcription logic
- Add concise comments only where they explain architecture decisions
- Provide beginner-readable abstractions

### Session output expectation

At the end of the Claude Code session for this module, the implementation should make it obvious:
- where Electron starts
- where IPC is registered
- where the pipeline is orchestrated
- where state is stored
- where future model integrations plug in

---

## 18. Dependencies

### Direct dependencies

Likely dependencies for this module:

- `electron`
- `typescript`
- `electron-is-dev` or equivalent (optional)
- test framework such as `jest` or `vitest`

### Future dependencies to plan around

- speech provider packages or child-process integration
- LLM provider SDKs
- SQLite library
- keychain/secure storage package

Do not tightly couple this module to future provider packages yet.

---

## 19. Risks and design cautions

### Main risks

- Mixing too much business logic into IPC handlers
- Tight coupling between renderer and main process
- Creating hard-to-debug async state bugs
- Letting speech/text provider logic leak into orchestration
- Not designing for failure states
- Overengineering too early

### Design guidance

- Keep the orchestration simple
- Use interfaces early
- Mock first, real integrations later
- Keep UI and backend loosely coupled
- Make status transitions observable and testable

---

## 20. Open questions / future work

- Exact global hotkey strategy across Mac/Windows/Linux
- Whether audio capture begins in Module 2 or waits for Module 3
- Whether to use a state machine library or plain guarded state object
- Whether final transcript insertion into active app belongs here or in a later integration layer
- Whether clipboard integration should be part of backend orchestration or a separate utility service
- Whether background tray app behavior is added in a future module

---

## 21. Definition of done

Module 2 is complete when all of the following are true:

- Electron main process starts successfully
- Main window loads renderer successfully
- IPC channels are defined and registered
- Backend app state exists and is typed
- Mode changes update backend state
- Mic start and stop requests are handled
- A mocked speech service is invoked through an interface
- A mocked text service is invoked through an interface
- Backend emits status updates to frontend
- Backend emits a final transcript result to frontend
- Duplicate pipeline starts are prevented
- Errors are handled safely and reset state correctly
- Basic tests for state and orchestration pass
- Small frontend updates required by backend changes are documented
- Code structure is clean enough that Modules 3, 4, and 5 can plug in without major rewrites

---

## 22. Handoff to next modules

### To Module 3 – Speech Model

Module 2 should hand off:
- `SpeechService` interface
- pipeline invocation point
- expected transcription result contract
- error expectations

### To Module 4 – Text Model

Module 2 should hand off:
- `TextService` interface
- mode-aware polishing invocation point
- expected final transcript contract

### To Module 5 – Database

Module 2 should hand off:
- final transcript object shape
- persistence trigger point after successful pipeline completion

### To Module 1 – Frontend updates

Module 2 may require:
- IPC listener wiring
- status rendering updates
- transcript preview support
- error display support

---

## 23. Implementation guidance for Claude Code

When implementing this module, Claude should follow this order:

1. Create or clean the Electron main process bootstrap
2. Define shared types for status, mode, transcript, and IPC payloads
3. Build central backend app state
4. Create service interfaces for speech and text
5. Implement mocked speech/text services
6. Create pipeline orchestration service
7. Register IPC handlers
8. Emit events back to renderer
9. Add tests for orchestration and state transitions
10. Document any required frontend changes

Claude should avoid implementing real model integrations in this module unless explicitly instructed.
