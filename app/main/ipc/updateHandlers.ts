import { ipcMain } from 'electron';
import { checkForUpdates, installUpdate } from '../services/autoUpdaterService';
import { IPC_CHECK_FOR_UPDATE, IPC_INSTALL_UPDATE } from './channels';

export function registerUpdateHandlers(): void {
  ipcMain.handle(IPC_CHECK_FOR_UPDATE, () => {
    checkForUpdates();
  });

  ipcMain.handle(IPC_INSTALL_UPDATE, () => {
    installUpdate();
  });
}
