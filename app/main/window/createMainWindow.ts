import { app, BrowserWindow } from 'electron';
import * as path from 'path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(process.resourcesPath, 'renderer/dist/index.html'));
  } else {
    // In dev, always try the Vite dev server first
    win.loadURL('http://localhost:3000');
  }

  return win;
}
