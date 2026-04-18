import { ipcMain } from 'electron';
import {
  IPC_MIC_START,
  IPC_MIC_STOP,
  IPC_MODE_CHANGE,
  IPC_GET_APP_STATE,
  IPC_RETRY_LAST_RUN,
  IPC_CANCEL_CURRENT_RUN,
} from './channels';
import { TranscriptionController } from '../controllers/transcriptionController';
import { AppStateController } from '../controllers/appStateController';

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
  ipcMain.handle('get-settings',     async () => ({})); // TODO Module 5: wire to db module
}
