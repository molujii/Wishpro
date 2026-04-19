import type { BrowserWindow } from 'electron';

// Mock electron-updater
const mockAutoUpdater = {
  logger: null as unknown,
  autoDownload: true,
  autoInstallOnAppQuit: true,
  on: jest.fn(),
  checkForUpdatesAndNotify: jest.fn().mockResolvedValue(undefined),
  quitAndInstall: jest.fn(),
};
jest.mock('electron-updater', () => ({ autoUpdater: mockAutoUpdater }));

// Mock electron-log
jest.mock('electron-log', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock electron ipcMain
jest.mock('electron', () => ({
  ipcMain: { on: jest.fn(), handle: jest.fn() },
}));

import { ipcMain } from 'electron';
import { initAutoUpdater, checkForUpdates, installUpdate } from '../services/autoUpdaterService';

function makeWindow(send = jest.fn()): BrowserWindow {
  return { webContents: { send } } as unknown as BrowserWindow;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initAutoUpdater', () => {
  it('sets autoDownload and autoInstallOnAppQuit', () => {
    const win = makeWindow();
    initAutoUpdater(win);
    expect(mockAutoUpdater.autoDownload).toBe(true);
    expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
  });

  it('registers all autoUpdater event listeners', () => {
    const win = makeWindow();
    initAutoUpdater(win);
    const registeredEvents = mockAutoUpdater.on.mock.calls.map(([ev]: [string]) => ev);
    expect(registeredEvents).toContain('checking-for-update');
    expect(registeredEvents).toContain('update-available');
    expect(registeredEvents).toContain('update-not-available');
    expect(registeredEvents).toContain('download-progress');
    expect(registeredEvents).toContain('update-downloaded');
    expect(registeredEvents).toContain('error');
  });

  it('sends checking status to renderer on checking-for-update event', () => {
    const send = jest.fn();
    const win  = makeWindow(send);
    initAutoUpdater(win);
    const handler = mockAutoUpdater.on.mock.calls.find(([ev]: [string]) => ev === 'checking-for-update')?.[1];
    handler?.();
    expect(send).toHaveBeenCalledWith('updater:status', { status: 'checking' });
  });

  it('sends available status with version to renderer', () => {
    const send = jest.fn();
    const win  = makeWindow(send);
    initAutoUpdater(win);
    const handler = mockAutoUpdater.on.mock.calls.find(([ev]: [string]) => ev === 'update-available')?.[1];
    handler?.({ version: '1.2.3' });
    expect(send).toHaveBeenCalledWith('updater:status', { status: 'available', version: '1.2.3' });
  });

  it('sends downloading status with percent to renderer', () => {
    const send = jest.fn();
    const win  = makeWindow(send);
    initAutoUpdater(win);
    const handler = mockAutoUpdater.on.mock.calls.find(([ev]: [string]) => ev === 'download-progress')?.[1];
    handler?.({ percent: 55.7 });
    expect(send).toHaveBeenCalledWith('updater:status', { status: 'downloading', percent: 56 });
  });

  it('sends ready status with version to renderer on update-downloaded', () => {
    const send = jest.fn();
    const win  = makeWindow(send);
    initAutoUpdater(win);
    const handler = mockAutoUpdater.on.mock.calls.find(([ev]: [string]) => ev === 'update-downloaded')?.[1];
    handler?.({ version: '1.2.3' });
    expect(send).toHaveBeenCalledWith('updater:status', { status: 'ready', version: '1.2.3' });
  });

  it('sends error status to renderer on error event', () => {
    const send = jest.fn();
    const win  = makeWindow(send);
    initAutoUpdater(win);
    const handler = mockAutoUpdater.on.mock.calls.find(([ev]: [string]) => ev === 'error')?.[1];
    handler?.(new Error('network error'));
    expect(send).toHaveBeenCalledWith('updater:status', { status: 'error', message: 'network error' });
  });
});

describe('checkForUpdates', () => {
  it('calls autoUpdater.checkForUpdatesAndNotify', () => {
    checkForUpdates();
    expect(mockAutoUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
  });
});

describe('installUpdate', () => {
  it('calls autoUpdater.quitAndInstall', () => {
    installUpdate();
    expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });
});

describe('registerUpdateHandlers', () => {
  it('registers handle for updater:check and updater:install', async () => {
    const { registerUpdateHandlers } = await import('../ipc/updateHandlers');
    registerUpdateHandlers();
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map(([ch]: [string]) => ch);
    expect(channels).toContain('updater:check');
    expect(channels).toContain('updater:install');
  });
});
