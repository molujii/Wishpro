export type AppMode = 'conversation' | 'coding' | 'custom';

export type AppStatus =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'polishing'
  | 'completed'
  | 'error';

export type TranscriptReadyPayload = {
  rawText: string;
  polishedText: string;
  mode: AppMode;
  createdAt: string;
};

export type ErrorPayload = { message: string; code?: string };

export type LogEventPayload = {
  level: 'info' | 'warn' | 'error';
  message: string;
  ts: string;
};

export type AppStateSnapshot = {
  status: AppStatus;
  mode: AppMode;
  pipelineActive: boolean;
  lastTranscript: TranscriptReadyPayload | null;
};

interface ElectronAPI {
  // --- Module 1 ---
  onHotkeyPressed:   (cb: () => void) => void;
  getSettings:       () => Promise<Record<string, unknown>>;
  micStart:          () => void;
  micStop:           () => void;
  modeChange:        (mode: AppMode) => void;

  // --- Module 2: push listeners (Main → Renderer) ---
  onStatusChange:    (cb: (payload: { status: AppStatus }) => void) => void;
  onTranscriptReady: (cb: (payload: TranscriptReadyPayload) => void) => void;
  onBackendError:    (cb: (payload: ErrorPayload) => void) => void;
  onLogEvent:        (cb: (payload: LogEventPayload) => void) => void;

  // --- Module 2: request/response ---
  getAppState: () => Promise<AppStateSnapshot>;

  // --- Module 2: fire-and-forget ---
  retryLastRun:      () => void;
  cancelCurrentRun:  () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
