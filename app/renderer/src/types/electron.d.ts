export type AppMode = 'conversation' | 'coding' | 'custom';

interface ElectronAPI {
  onHotkeyPressed: (cb: () => void) => void;
  getSettings: () => Promise<Record<string, unknown>>;
  micStart: () => void;
  micStop: () => void;
  modeChange: (mode: AppMode) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
