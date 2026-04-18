import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../app/renderer/dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.webContents.send('hotkey-pressed');
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-settings', async () => {
  // TODO Module 5: wire up to modules/db
  return {};
});

ipcMain.on('ui:mic-start', () => {
  console.log('[IPC] ui:mic-start received');
  // TODO Module 2: trigger audio capture
});

ipcMain.on('ui:mic-stop', () => {
  console.log('[IPC] ui:mic-stop received');
  // TODO Module 2: stop audio capture, pass buffer to speech module
});

ipcMain.on('ui:mode-change', (_event: unknown, payload: { mode: string }) => {
  console.log('[IPC] ui:mode-change received:', payload.mode);
  // TODO Module 2: pass mode to orchestrator
});
