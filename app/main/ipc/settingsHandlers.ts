import { ipcMain } from 'electron';
import { IPC_GET_SETTINGS, IPC_SAVE_SETTINGS } from './channels';
import { loadSettings, persistSettings, AppSettings } from '../services/settingsService';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_GET_SETTINGS, async () => {
    return loadSettings();
  });

  ipcMain.handle(IPC_SAVE_SETTINGS, async (_event, patch: Partial<AppSettings>) => {
    await persistSettings(patch);
    return loadSettings();
  });
}
