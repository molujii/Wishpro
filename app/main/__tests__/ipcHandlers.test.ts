import { TranscriptionController } from '../controllers/transcriptionController';
import { AppStateController } from '../controllers/appStateController';
import { PipelineService } from '../services/pipelineService';
import { resetAppState, getAppState, patchAppState } from '../state/appState';

// Mock electron's ipcMain so we can assert registrations
jest.mock('electron', () => ({
  ipcMain: {
    on:     jest.fn(),
    handle: jest.fn(),
  },
}));

import { ipcMain } from 'electron';

beforeEach(() => {
  resetAppState();
  jest.clearAllMocks();
});

function makePipeline(): PipelineService {
  return {
    startPipeline:    jest.fn().mockResolvedValue(undefined),
    stopAndTranscribe: jest.fn().mockResolvedValue(undefined),
    retryLastRun:     jest.fn().mockResolvedValue(undefined),
    cancelCurrentRun: jest.fn().mockResolvedValue(undefined),
  } as unknown as PipelineService;
}

describe('registerIpcHandlers', () => {
  it('registers all ipcMain.on channels', async () => {
    const { registerIpcHandlers } = await import('../ipc/registerIpcHandlers');
    const pipeline    = makePipeline();
    const txCtrl      = new TranscriptionController(pipeline);
    const stateCtrl   = new AppStateController(getAppState, patchAppState, pipeline);
    registerIpcHandlers(txCtrl, stateCtrl);

    const registeredOnChannels = (ipcMain.on as jest.Mock).mock.calls.map(([ch]) => ch);
    expect(registeredOnChannels).toContain('ui:mic-start');
    expect(registeredOnChannels).toContain('ui:mic-stop');
    expect(registeredOnChannels).toContain('ui:mode-change');
    expect(registeredOnChannels).toContain('ui:retry-last-run');
    expect(registeredOnChannels).toContain('ui:cancel-current-run');
  });

  it('registers ipcMain.handle for ui:get-app-state', async () => {
    const { registerIpcHandlers } = await import('../ipc/registerIpcHandlers');
    const pipeline    = makePipeline();
    const txCtrl      = new TranscriptionController(pipeline);
    const stateCtrl   = new AppStateController(getAppState, patchAppState, pipeline);
    registerIpcHandlers(txCtrl, stateCtrl);

    const registeredHandleChannels = (ipcMain.handle as jest.Mock).mock.calls.map(([ch]) => ch);
    expect(registeredHandleChannels).toContain('ui:get-app-state');
  });
});

describe('TranscriptionController', () => {
  const fakeEvent = {} as Electron.IpcMainEvent;

  it('onMicStart delegates to pipeline.startPipeline', () => {
    const pipeline = makePipeline();
    const ctrl = new TranscriptionController(pipeline);
    ctrl.onMicStart(fakeEvent);
    expect(pipeline.startPipeline).toHaveBeenCalledTimes(1);
  });

  it('onMicStop delegates to pipeline.stopAndTranscribe', () => {
    const pipeline = makePipeline();
    const ctrl = new TranscriptionController(pipeline);
    ctrl.onMicStop(fakeEvent);
    expect(pipeline.stopAndTranscribe).toHaveBeenCalledTimes(1);
  });

  it('onRetryLastRun delegates to pipeline.retryLastRun', () => {
    const pipeline = makePipeline();
    const ctrl = new TranscriptionController(pipeline);
    ctrl.onRetryLastRun(fakeEvent);
    expect(pipeline.retryLastRun).toHaveBeenCalledTimes(1);
  });
});

describe('AppStateController', () => {
  const fakeInvokeEvent = {} as Electron.IpcMainInvokeEvent;
  const fakeEvent       = {} as Electron.IpcMainEvent;

  it('onGetAppState returns serialisable AppStateSnapshot', () => {
    const pipeline = makePipeline();
    const ctrl = new AppStateController(getAppState, patchAppState, pipeline);
    const snapshot = ctrl.onGetAppState(fakeInvokeEvent);
    expect(snapshot).toMatchObject({
      status:         'idle',
      mode:           'conversation',
      pipelineActive: false,
      lastTranscript: null,
    });
  });

  it('onModeChange updates appState.mode', () => {
    const pipeline = makePipeline();
    const ctrl = new AppStateController(getAppState, patchAppState, pipeline);
    ctrl.onModeChange(fakeEvent, { mode: 'coding' });
    expect(getAppState().mode).toBe('coding');
  });

  it('onModeChange rejects invalid mode', () => {
    const pipeline = makePipeline();
    const ctrl = new AppStateController(getAppState, patchAppState, pipeline);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    ctrl.onModeChange(fakeEvent, { mode: 'invalid' as never });
    expect(getAppState().mode).toBe('conversation'); // unchanged
    warnSpy.mockRestore();
  });

  it('onCancelCurrentRun delegates to pipeline.cancelCurrentRun', () => {
    const pipeline = makePipeline();
    const ctrl = new AppStateController(getAppState, patchAppState, pipeline);
    ctrl.onCancelCurrentRun(fakeEvent);
    expect(pipeline.cancelCurrentRun).toHaveBeenCalledTimes(1);
  });
});
