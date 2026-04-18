import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_MIC_START,
  IPC_MIC_STOP,
  IPC_MODE_CHANGE,
  IPC_GET_APP_STATE,
  IPC_RETRY_LAST_RUN,
  IPC_CANCEL_CURRENT_RUN,
  IPC_STATUS_CHANGE,
  IPC_TRANSCRIPT_READY,
  IPC_ERROR,
  IPC_LOG_EVENT,
} from '../ipc/channels';
import {
  StatusChangePayload,
  TranscriptReadyPayload,
  ErrorPayload,
  LogEventPayload,
  AppStateSnapshot,
  ModeChangePayload,
} from '../types/ipc';

export type AppMode = 'conversation' | 'coding' | 'custom';

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Existing API (Module 1) ---
  onHotkeyPressed: (cb: () => void) =>
    ipcRenderer.on('hotkey-pressed', (_event) => cb()),

  getSettings: () => ipcRenderer.invoke('get-settings'),

  micStart: () => ipcRenderer.send(IPC_MIC_START),
  micStop:  () => ipcRenderer.send(IPC_MIC_STOP),

  modeChange: (mode: AppMode) =>
    ipcRenderer.send(IPC_MODE_CHANGE, { mode } as ModeChangePayload),

  // --- New: Module 2 push listeners (Main → Renderer) ---
  onStatusChange: (cb: (payload: StatusChangePayload) => void) =>
    ipcRenderer.on(IPC_STATUS_CHANGE, (_event, payload) => cb(payload)),

  onTranscriptReady: (cb: (payload: TranscriptReadyPayload) => void) =>
    ipcRenderer.on(IPC_TRANSCRIPT_READY, (_event, payload) => cb(payload)),

  onBackendError: (cb: (payload: ErrorPayload) => void) =>
    ipcRenderer.on(IPC_ERROR, (_event, payload) => cb(payload)),

  onLogEvent: (cb: (payload: LogEventPayload) => void) =>
    ipcRenderer.on(IPC_LOG_EVENT, (_event, payload) => cb(payload)),

  // --- New: Module 2 request/response ---
  getAppState: (): Promise<AppStateSnapshot> =>
    ipcRenderer.invoke(IPC_GET_APP_STATE),

  // --- New: Module 2 fire-and-forget ---
  retryLastRun:     () => ipcRenderer.send(IPC_RETRY_LAST_RUN),
  cancelCurrentRun: () => ipcRenderer.send(IPC_CANCEL_CURRENT_RUN),
});
