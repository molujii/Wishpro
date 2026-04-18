import { contextBridge, ipcRenderer } from 'electron';

export type AppMode = 'conversation' | 'coding' | 'custom';

contextBridge.exposeInMainWorld('electronAPI', {
  onHotkeyPressed: (cb: () => void) =>
    ipcRenderer.on('hotkey-pressed', (_event, ...args) => cb(...(args as []))),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  micStart: () => ipcRenderer.send('ui:mic-start'),
  micStop: () => ipcRenderer.send('ui:mic-stop'),
  modeChange: (mode: AppMode) => ipcRenderer.send('ui:mode-change', { mode }),
});
