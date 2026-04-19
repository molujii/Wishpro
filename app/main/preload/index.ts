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
  IPC_CHECK_FOR_UPDATE,
  IPC_INSTALL_UPDATE,
  IPC_UPDATE_STATUS,
  IPC_GET_SETTINGS,
  IPC_SAVE_SETTINGS,
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

  // --- Module 9: auto-updater ---
  checkForUpdate: () => ipcRenderer.invoke(IPC_CHECK_FOR_UPDATE),
  installUpdate:  () => ipcRenderer.invoke(IPC_INSTALL_UPDATE),
  onUpdateStatus: (cb: (payload: import('../types/ipc').UpdateStatusPayload) => void) =>
    ipcRenderer.on(IPC_UPDATE_STATUS, (_event, payload) => cb(payload)),

  // --- Module 6: settings ---
  getSettings:  (): Promise<import('../services/settingsService').AppSettings> =>
    ipcRenderer.invoke(IPC_GET_SETTINGS),
  saveSettings: (patch: Partial<import('../services/settingsService').AppSettings>): Promise<import('../services/settingsService').AppSettings> =>
    ipcRenderer.invoke(IPC_SAVE_SETTINGS, patch),
});
