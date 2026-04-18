# Module 2 — Backend / Logic — Implementation Plan

## Context

The Electron main process currently lives as a flat stub in `app/main/index.ts` with hardcoded IPC handlers, inline window creation, and no real orchestration. Module 2 restructures this into a layered, interface-first backend that proves the full voice transcription pipeline end-to-end using mock services — before any real ASR or LLM engines are wired in (those belong to Modules 3 and 4).

The goal: a mic-start → listening → transcribing → polishing → completed flow that the frontend can observe via push events, with clean interfaces ready for Module 3/4 plug-in and full unit-test coverage.

---

## Target Folder Structure

```
app/main/
  index.ts                              MODIFY — thin bootstrap only
  window/
    createMainWindow.ts                 CREATE — extracted BrowserWindow factory
  ipc/
    channels.ts                         CREATE — typed string constants for all channels
    registerIpcHandlers.ts              CREATE — single registration point
  controllers/
    transcriptionController.ts          CREATE — IPC → pipeline bridge
    appStateController.ts               CREATE — IPC → state bridge
  services/
    speechService.ts                    CREATE — SpeechService interface + MockSpeechService + FailingSpeechService
    textService.ts                      CREATE — TextService interface + MockTextService + FailingTextService
    hotkeyService.ts                    CREATE — extracted globalShortcut wrapper
    pipelineService.ts                  CREATE — core orchestrator (critical file)
    logger.ts                           CREATE — structured logger with injected emit fn
  state/
    appState.ts                         CREATE — mutable singleton + accessors
    stateMachine.ts                     CREATE — pure transition validator
  types/
    status.ts                           CREATE — AppStatus union
    mode.ts                             CREATE — AppMode union
    transcript.ts                       CREATE — RawTranscript, FinalTranscript
    ipc.ts                              CREATE — all IPC payload types + AppStateSnapshot
  preload/
    index.ts                            MOVE from app/main/preload.ts + extend
```

---

## Implementation Order

### Step 1 — Types (no dependencies)

**`app/main/types/status.ts`**
```ts
export type AppStatus =
  | 'idle' | 'listening' | 'transcribing'
  | 'polishing' | 'completed' | 'error';
```

**`app/main/types/mode.ts`**
```ts
export type AppMode = 'conversation' | 'coding' | 'custom';
```

**`app/main/types/transcript.ts`**
```ts
export interface RawTranscript {
  text: string; language?: string; durationMs?: number; createdAt: string;
}
export interface FinalTranscript {
  rawText: string; polishedText: string; mode: AppMode; language?: string; createdAt: string;
}
```

**`app/main/types/ipc.ts`**
```ts
export type ModeChangePayload      = { mode: AppMode };
export type StatusChangePayload    = { status: AppStatus };
export type TranscriptReadyPayload = { rawText: string; polishedText: string; mode: AppMode; createdAt: string };
export type ErrorPayload           = { message: string; code?: string };
export type LogEventPayload        = { level: 'info'|'warn'|'error'; message: string; ts: string };
export interface AppStateSnapshot  {
  status: AppStatus; mode: AppMode;
  pipelineActive: boolean;
  lastTranscript: TranscriptReadyPayload | null;
}
```

---

### Step 2 — IPC Channel Constants

**`app/main/ipc/channels.ts`**
```ts
// Renderer → Main
export const IPC_MIC_START          = 'ui:mic-start'            as const;
export const IPC_MIC_STOP           = 'ui:mic-stop'             as const;
export const IPC_MODE_CHANGE        = 'ui:mode-change'          as const;
export const IPC_GET_APP_STATE      = 'ui:get-app-state'        as const;
export const IPC_RETRY_LAST_RUN     = 'ui:retry-last-run'       as const;
export const IPC_CANCEL_CURRENT_RUN = 'ui:cancel-current-run'   as const;

// Main → Renderer
export const IPC_STATUS_CHANGE      = 'backend:status-change'   as const;
export const IPC_STATE_SYNC         = 'backend:state-sync'      as const;
export const IPC_TRANSCRIPT_READY   = 'backend:transcript-ready' as const;
export const IPC_ERROR              = 'backend:error'           as const;
export const IPC_LOG_EVENT          = 'backend:log-event'       as const;
```

---

### Step 3 — App State

**`app/main/state/appState.ts`** — module-level singleton (not a class); main process is single-instance so no concurrency concern. `resetAppState()` is provided for test isolation.

```ts
export interface AppStateShape {
  status: AppStatus; mode: AppMode;
  pipelineActive: boolean; lastTranscript: FinalTranscript | null;
}
export function getAppState(): Readonly<AppStateShape>
export function patchAppState(patch: Partial<AppStateShape>): void
export function resetAppState(): void   // resets to initial defaults — used in tests
```

**`app/main/state/stateMachine.ts`** — pure functions, no side effects.

```ts
const VALID_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  idle:         ['listening',    'error'],
  listening:    ['transcribing', 'error'],
  transcribing: ['polishing',    'error'],
  polishing:    ['completed',    'error'],
  completed:    ['idle',         'error'],
  error:        ['idle',         'error'],
};

export function canTransition(from: AppStatus, to: AppStatus): boolean
export function assertTransition(from: AppStatus, to: AppStatus): void  // throws TransitionError
export class TransitionError extends Error {}
```

---

### Step 4 — Logger

**`app/main/services/logger.ts`** — `SendFn` is injected so tests pass a jest mock instead of a real `webContents.send`.

```ts
type SendFn = (channel: string, payload: LogEventPayload) => void;
export class Logger {
  constructor(private readonly send: SendFn) {}
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}
```

---

### Step 5 — Service Interfaces + Mock Implementations

**`app/main/services/speechService.ts`**
```ts
export interface SpeechService {
  startCapture(): Promise<void>;
  stopCaptureAndTranscribe(): Promise<RawTranscript>;
}
export class MockSpeechService implements SpeechService { ... }    // returns { text: 'Mock transcript', ... }
export class FailingSpeechService implements SpeechService { ... } // always rejects — for failure-path tests
```

**`app/main/services/textService.ts`**
```ts
export interface TextService {
  polishTranscript(input: RawTranscript, mode: AppMode): Promise<FinalTranscript>;
}
export class MockTextService implements TextService { ... }        // returns `[${mode}] ${input.text}`
export class FailingTextService implements TextService { ... }     // always rejects
```

Mock classes are co-located with their interfaces so Module 3/4 authors can see the contract they must satisfy.

---

### Step 6 — HotkeyService

**`app/main/services/hotkeyService.ts`**
```ts
export class HotkeyService {
  private readonly shortcut = 'CommandOrControl+Shift+Space';
  register(handler: () => void): void
  unregister(): void
}
```

---

### Step 7 — PipelineService (critical file)

**`app/main/services/pipelineService.ts`** — all dependencies injected; no direct Electron imports so it is fully unit-testable without running Electron.

```ts
type EmitFn = (channel: string, payload: unknown) => void;
export interface PipelineDeps {
  speechService: SpeechService;
  textService:   TextService;
  logger:        Logger;
  emit:          EmitFn;
  getState:      () => Readonly<AppStateShape>;
  patchState:    (p: Partial<AppStateShape>) => void;
}

export class PipelineService {
  constructor(private deps: PipelineDeps) {}

  async startPipeline(): Promise<void>
  // Guard: if pipelineActive → warn + noop (duplicate-start prevention)
  // idle → listening; speechService.startCapture(); emit status-change

  async stopAndTranscribe(): Promise<void>
  // listening → transcribing → polishing → completed
  // calls speech then text services sequentially
  // emits status-change at each step, then transcript-ready on completion
  // on any error → handleError()

  async retryLastRun(): Promise<void>
  // completed → idle → listening → transcribing → polishing → completed
  // re-polishes lastTranscript with current mode; noop if null

  async cancelCurrentRun(): Promise<void>
  // transitions to error then idle; noop if not pipelineActive

  private transitionTo(next: AppStatus): void
  // calls assertTransition, patchState, emits backend:status-change

  private handleError(err: unknown): void
  // transitions to error, emits backend:error, resets pipelineActive=false
}
```

All state mutations go through `transitionTo` — nothing bypasses the state machine.

---

### Step 8 — Controllers (thin IPC → service bridges)

**`app/main/controllers/transcriptionController.ts`**
```ts
export class TranscriptionController {
  constructor(private pipeline: PipelineService) {}
  onMicStart(_event: IpcMainEvent): void
  onMicStop(_event: IpcMainEvent): void
  onRetryLastRun(_event: IpcMainEvent): void
}
```

**`app/main/controllers/appStateController.ts`**
```ts
export class AppStateController {
  constructor(
    private getState: () => Readonly<AppStateShape>,
    private patchState: (p: Partial<AppStateShape>) => void,
    private pipeline: PipelineService,
  ) {}
  onGetAppState(_event: IpcMainInvokeEvent): AppStateSnapshot
  onModeChange(_event: IpcMainEvent, payload: ModeChangePayload): void
  onCancelCurrentRun(_event: IpcMainEvent): void
}
```

No business logic in controllers — they parse IPC arguments and delegate.

---

### Step 9 — IPC Registration

**`app/main/ipc/registerIpcHandlers.ts`**
```ts
export function registerIpcHandlers(
  txCtrl: TranscriptionController,
  stateCtrl: AppStateController,
): void {
  ipcMain.on(IPC_MIC_START,          (e)    => txCtrl.onMicStart(e));
  ipcMain.on(IPC_MIC_STOP,           (e)    => txCtrl.onMicStop(e));
  ipcMain.on(IPC_MODE_CHANGE,        (e, p) => stateCtrl.onModeChange(e, p));
  ipcMain.on(IPC_RETRY_LAST_RUN,     (e)    => txCtrl.onRetryLastRun(e));
  ipcMain.on(IPC_CANCEL_CURRENT_RUN, (e)    => stateCtrl.onCancelCurrentRun(e));
  ipcMain.handle(IPC_GET_APP_STATE,  (e)    => stateCtrl.onGetAppState(e));
  ipcMain.handle('get-settings',     async () => ({})); // TODO Module 5
}
```

---

### Step 10 — Window Factory

**`app/main/window/createMainWindow.ts`** — extracts the `BrowserWindow` creation from `index.ts` verbatim. Update preload path to `'preload/index.js'` (matching new preload location).

---

### Step 11 — Preload (MOVE + EXTEND)

Move `app/main/preload.ts` → `app/main/preload/index.ts`. Keep existing five exposures; add:

```ts
// New push listeners (Main → Renderer)
onStatusChange:    (cb: (p: StatusChangePayload)     => void) => void
onTranscriptReady: (cb: (p: TranscriptReadyPayload)  => void) => void
onBackendError:    (cb: (p: ErrorPayload)            => void) => void
onLogEvent:        (cb: (p: LogEventPayload)         => void) => void

// New request/response
getAppState: () => Promise<AppStateSnapshot>

// New fire-and-forget
retryLastRun:     () => void
cancelCurrentRun: () => void
```

Import channel names from `../ipc/channels` (same `rootDir` tree, no module alias needed in preload context).

---

### Step 12 — Refactor Entry Point

**MODIFY `app/main/index.ts`** — reduce to pure bootstrap:

```ts
app.whenReady().then(() => {
  mainWindow = createMainWindow();
  const emit      = (ch: string, p: unknown): void => { mainWindow?.webContents.send(ch, p); };
  const logger    = new Logger(emit);
  const pipeline  = new PipelineService({
    speechService: new MockSpeechService(),
    textService:   new MockTextService(),
    logger, emit,
    getState: getAppState,
    patchState: patchAppState,
  });
  const txCtrl    = new TranscriptionController(pipeline);
  const stateCtrl = new AppStateController(getAppState, patchAppState, pipeline);
  const hotkey    = new HotkeyService();

  registerIpcHandlers(txCtrl, stateCtrl);
  hotkey.register(() => mainWindow?.webContents.send('hotkey-pressed'));
  logger.info('App initialized');
});

app.on('will-quit',          () => hotkey.unregister());
app.on('window-all-closed',  () => { if (process.platform !== 'darwin') app.quit(); });
```

---

## Tests

All test files live under `app/main/__tests__/` (in Jest's `roots` for the `main` project).

### `stateMachine.test.ts`
- All valid transitions pass `canTransition`
- `listening→listening`, `transcribing→listening`, `polishing→listening` are invalid
- `assertTransition` throws `TransitionError` with readable message
- `any → error` is always valid

### `appState.test.ts`
- Initial state shape is correct
- `patchAppState` updates only specified fields
- `resetAppState()` reverts to defaults (test isolation)
- `getAppState()` returns a shallow copy — mutations don't affect internal state

### `pipelineService.test.ts` (most critical)
- `startPipeline` transitions `idle → listening`, calls `speechService.startCapture`, emits status-change
- Duplicate start (when `pipelineActive=true`) is a noop with a warning log
- `stopAndTranscribe` happy path: transitions through all states, emits `transcript-ready`, sets `pipelineActive=false`
- Speech failure: transitions to `error`, emits `backend:error`, resets `pipelineActive`
- Text failure: same as speech failure
- `cancelCurrentRun` transitions to `error → idle` when active; noop when inactive
- `retryLastRun` re-polishes last transcript; noop when `lastTranscript` is null

### `ipcHandlers.test.ts`
- `registerIpcHandlers` registers all channels (mock `ipcMain`)
- Each controller method delegates correctly to pipeline/state

---

## Required Frontend Changes

### `app/renderer/src/types/electron.d.ts` — MODIFY
Add the 7 new `ElectronAPI` methods and expand types:
```ts
type AppStatus = 'idle'|'listening'|'transcribing'|'polishing'|'completed'|'error';
// + onStatusChange, onTranscriptReady, onBackendError, onLogEvent, getAppState,
//   retryLastRun, cancelCurrentRun
```

### `app/renderer/src/context/AppContext.tsx` — MODIFY
- Expand `Status` type to include `'polishing' | 'completed' | 'error'`
- Add `lastTranscript: TranscriptReadyPayload | null` to context shape
- Add `syncFromBackend(snapshot)` helper for batch-updating from state-sync events

### `app/renderer/src/components/StatusText/StatusText.tsx` — MODIFY
Add labels: `polishing: 'Polishing...'`, `completed: 'Done'`, `error: 'Error'`

### `app/renderer/src/App.tsx` — MODIFY
Wire new listeners in `useEffect`:
```ts
window.electronAPI?.onStatusChange(({ status }) => setStatus(status));
window.electronAPI?.onBackendError(({ message }) => setStatus('error'));
window.electronAPI?.getAppState().then(snapshot => syncFromBackend(snapshot));
```

---

## Design Decisions

- **`index.ts` kept as entry filename** — `package.json#main` is `dist/main/index.js`; renaming is unnecessary churn.
- **AppState as module singleton** — main process is single-instance; a plain mutable object with `resetAppState()` is simpler than a class and fully testable. `getAppState()` returns a shallow copy to prevent accidental external mutation.
- **PipelineService is fully dependency-injected** — no direct Electron imports; unit-testable without running Electron.
- **Mock services co-located with interfaces** — Module 3/4 authors immediately see the contract to satisfy.
- **`completed` does not auto-advance to `idle`** — avoids timing-based state resets; a new `mic-start` or explicit retry action triggers the transition.

---

## Verification

```bash
# 1. Type-check main process
npx tsc -p tsconfig.main.json --noEmit      # expect: 0 errors

# 2. Type-check renderer
npx tsc -p app/renderer/tsconfig.json --noEmit  # expect: 0 errors

# 3. Unit tests
npm test                                     # expect: 78 tests pass across 8 suites

# 4. Lint
npm run lint                                 # expect: 0 errors

# 5. Dev mode end-to-end smoke test
npm run dev
# ✓ Electron opens overlay
# ✓ Press mic button → terminal: [INFO] idle → listening, status-change emitted
# ✓ Release mic button → terminal: [INFO] listening → transcribing → polishing → completed
# ✓ Frontend shows "Transcribing..." then "Polishing..." then "Done"
# ✓ Transcript payload logged in terminal (mock text)
# ✓ Second mic-start while pipeline active → terminal: [WARN] duplicate start ignored
# ✓ Mode change → backend state.mode updated
```

---

## File Change Summary

| File | Action |
|---|---|
| `app/main/index.ts` | MODIFY — thin bootstrap |
| `app/main/preload.ts` | DELETE (moved to preload/index.ts) |
| `app/main/preload/index.ts` | CREATE (moved + extended with 7 new methods) |
| `app/main/types/status.ts` | CREATE |
| `app/main/types/mode.ts` | CREATE |
| `app/main/types/transcript.ts` | CREATE |
| `app/main/types/ipc.ts` | CREATE |
| `app/main/ipc/channels.ts` | CREATE |
| `app/main/ipc/registerIpcHandlers.ts` | CREATE |
| `app/main/state/appState.ts` | CREATE |
| `app/main/state/stateMachine.ts` | CREATE |
| `app/main/services/logger.ts` | CREATE |
| `app/main/services/speechService.ts` | CREATE |
| `app/main/services/textService.ts` | CREATE |
| `app/main/services/hotkeyService.ts` | CREATE |
| `app/main/services/pipelineService.ts` | CREATE |
| `app/main/controllers/transcriptionController.ts` | CREATE |
| `app/main/controllers/appStateController.ts` | CREATE |
| `app/main/window/createMainWindow.ts` | CREATE |
| `app/main/__tests__/stateMachine.test.ts` | CREATE |
| `app/main/__tests__/appState.test.ts` | CREATE |
| `app/main/__tests__/pipelineService.test.ts` | CREATE |
| `app/main/__tests__/ipcHandlers.test.ts` | CREATE |
| `app/renderer/src/types/electron.d.ts` | MODIFY |
| `app/renderer/src/context/AppContext.tsx` | MODIFY |
| `app/renderer/src/components/StatusText/StatusText.tsx` | MODIFY |
| `app/renderer/src/App.tsx` | MODIFY |
