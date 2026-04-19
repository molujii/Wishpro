import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window/createMainWindow';
import { HotkeyService } from './services/hotkeyService';
import { Logger } from './services/logger';
import { PipelineService } from './services/pipelineService';
import { TranscriptionController } from './controllers/transcriptionController';
import { AppStateController } from './controllers/appStateController';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { getAppState, patchAppState } from './state/appState';
import { initAutoUpdater, checkForUpdates } from './services/autoUpdaterService';
import { initDatabase, loadSettings, buildSpeechService, buildTextService } from './services/settingsService';

let mainWindow: BrowserWindow | null = null;
let hotkeyService: HotkeyService | null = null;

app.whenReady().then(async () => {
  initDatabase();

  mainWindow = createMainWindow();
  initAutoUpdater(mainWindow);

  const emit = (channel: string, payload: unknown): void => {
    mainWindow?.webContents.send(channel, payload);
  };

  const logger = new Logger(emit);

  const settings      = await loadSettings();
  const speechService = buildSpeechService(settings);
  const textService   = buildTextService(settings);

  const pipeline  = new PipelineService({
    speechService,
    textService,
    logger,
    emit,
    getState:   getAppState,
    patchState: patchAppState,
  });

  const txCtrl    = new TranscriptionController(pipeline);
  const stateCtrl = new AppStateController(getAppState, patchAppState, pipeline);

  registerIpcHandlers(txCtrl, stateCtrl);

  hotkeyService = new HotkeyService();
  hotkeyService.register(() => mainWindow?.webContents.send('hotkey-pressed'));

  // Check for updates 3 seconds after startup to avoid blocking launch
  setTimeout(() => checkForUpdates(), 3000);

  logger.info('App initialized');
});

app.on('will-quit', () => {
  hotkeyService?.unregister();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
