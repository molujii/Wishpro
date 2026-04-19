import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';
import log from 'electron-log';
import { IPC_UPDATE_STATUS } from '../ipc/channels';

export type UpdateStatus =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateStatusPayload {
  status: UpdateStatus;
  version?: string;
  percent?: number;
  message?: string;
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (payload: UpdateStatusPayload): void => {
    mainWindow.webContents.send(IPC_UPDATE_STATUS, payload);
  };

  autoUpdater.on('checking-for-update', () => {
    send({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    send({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    send({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    send({ status: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    send({ status: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    send({ status: 'error', message: err.message });
  });
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.error('checkForUpdates failed:', err);
  });
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
