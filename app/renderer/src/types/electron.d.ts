export type AppMode = 'conversation' | 'coding' | 'custom';

export type SpeechProviderSetting = 'mock' | 'whisper-cpp';
export type TextProviderSetting   = 'mock' | 'ollama';
export type EnhancementSetting    = 'light' | 'normal' | 'heavy';

export type AppSettings = {
  speechProvider:  SpeechProviderSetting;
  speechModelPath: string;
  speechExecPath:  string;
  speechLanguage:  string;
  textProvider:    TextProviderSetting;
  textModel:       string;
  textOllamaUrl:   string;
  textEnhancement: EnhancementSetting;
};

export type UpdateStatusKind =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error';

export type UpdateStatusPayload = {
  status: UpdateStatusKind;
  version?: string;
  percent?: number;
  message?: string;
};

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

  // --- Module 9: auto-updater ---
  checkForUpdate:  () => Promise<void>;
  installUpdate:   () => Promise<void>;
  onUpdateStatus:  (cb: (payload: UpdateStatusPayload) => void) => void;

  // --- Module 6: settings ---
  getSettings:  () => Promise<AppSettings>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
