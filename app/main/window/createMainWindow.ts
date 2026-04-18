import { BrowserWindow } from 'electron';
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

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../../../app/renderer/dist/index.html'));
  }

  return win;
}
