import { PipelineService, PipelineDeps } from '../services/pipelineService';
import { MockSpeechService, FailingSpeechService } from '../services/speechService';
import { MockTextService, FailingTextService } from '../services/textService';
import { Logger } from '../services/logger';
import { resetAppState, getAppState, patchAppState } from '../state/appState';
import { IPC_STATUS_CHANGE, IPC_TRANSCRIPT_READY, IPC_ERROR } from '../ipc/channels';

interface TestDeps extends PipelineDeps {
  emit: jest.Mock;
}

function makeDeps(overrides: Partial<PipelineDeps> = {}): TestDeps {
  const emit: jest.Mock = jest.fn();
  const logSend = jest.fn();
  const logger = new Logger(logSend);

  const deps: TestDeps = {
    speechService: new MockSpeechService(),
    textService:   new MockTextService(),
    logger,
    emit,
    getState:   getAppState,
    patchState: patchAppState,
  };

  return { ...deps, ...overrides, emit: overrides.emit ? overrides.emit as jest.Mock : emit };
}

beforeEach(() => {
  resetAppState();
});

describe('startPipeline', () => {
  it('transitions state idle → listening', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    expect(getAppState().status).toBe('listening');
  });

  it('emits backend:status-change with listening', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    expect(deps.emit).toHaveBeenCalledWith(IPC_STATUS_CHANGE, { status: 'listening' });
  });

  it('calls speechService.startCapture', async () => {
    const speechService = new MockSpeechService();
    const startSpy = jest.spyOn(speechService, 'startCapture');
    const deps = makeDeps({ speechService });
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT start a second pipeline when pipelineActive=true', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline(); // first start — sets pipelineActive=true
    deps.emit.mockClear();
    await pipeline.startPipeline(); // second start — should be ignored
    expect(deps.emit).not.toHaveBeenCalled();
  });

  it('sets pipelineActive=true', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    expect(getAppState().pipelineActive).toBe(true);
  });
});

describe('stopAndTranscribe — happy path', () => {
  async function runFullPipeline(deps: PipelineDeps & { emit: jest.Mock }): Promise<PipelineService> {
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.stopAndTranscribe();
    return pipeline;
  }

  it('transitions through all states to completed', async () => {
    const deps = makeDeps();
    await runFullPipeline(deps);
    const statusCalls = deps.emit.mock.calls
      .filter(([ch]) => ch === IPC_STATUS_CHANGE)
      .map(([, p]) => (p as { status: string }).status);
    expect(statusCalls).toEqual(['listening', 'transcribing', 'polishing', 'completed']);
  });

  it('emits backend:transcript-ready', async () => {
    const deps = makeDeps();
    await runFullPipeline(deps);
    const call = deps.emit.mock.calls.find(([ch]) => ch === IPC_TRANSCRIPT_READY);
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({
      rawText: 'Mock transcript from speech service',
      polishedText: expect.stringContaining('Mock transcript'),
      mode: 'conversation',
    });
  });

  it('sets pipelineActive=false after completion', async () => {
    const deps = makeDeps();
    await runFullPipeline(deps);
    expect(getAppState().pipelineActive).toBe(false);
  });

  it('stores lastTranscript in appState', async () => {
    const deps = makeDeps();
    await runFullPipeline(deps);
    expect(getAppState().lastTranscript).not.toBeNull();
    expect(getAppState().lastTranscript?.rawText).toBe('Mock transcript from speech service');
  });

  it('final status is completed', async () => {
    const deps = makeDeps();
    await runFullPipeline(deps);
    expect(getAppState().status).toBe('completed');
  });
});

describe('stopAndTranscribe — speech failure', () => {
  it('transitions to error state', async () => {
    const deps = makeDeps({ speechService: new FailingSpeechService() });
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.stopAndTranscribe();
    expect(getAppState().status).toBe('error');
  });

  it('emits backend:error', async () => {
    const deps = makeDeps({ speechService: new FailingSpeechService() });
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.stopAndTranscribe();
    const errorCall = deps.emit.mock.calls.find(([ch]) => ch === IPC_ERROR);
    expect(errorCall).toBeDefined();
    expect(errorCall![1]).toHaveProperty('message');
  });

  it('sets pipelineActive=false', async () => {
    const deps = makeDeps({ speechService: new FailingSpeechService() });
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.stopAndTranscribe();
    expect(getAppState().pipelineActive).toBe(false);
  });
});

describe('stopAndTranscribe — text failure', () => {
  it('transitions to error state', async () => {
    const deps = makeDeps({ textService: new FailingTextService() });
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.stopAndTranscribe();
    expect(getAppState().status).toBe('error');
  });

  it('emits backend:error', async () => {
    const deps = makeDeps({ textService: new FailingTextService() });
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.stopAndTranscribe();
    const errorCall = deps.emit.mock.calls.find(([ch]) => ch === IPC_ERROR);
    expect(errorCall).toBeDefined();
  });
});

describe('cancelCurrentRun', () => {
  it('transitions to error when pipeline is active', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    await pipeline.startPipeline();
    await pipeline.cancelCurrentRun();
    expect(getAppState().status).toBe('error');
    expect(getAppState().pipelineActive).toBe(false);
  });

  it('is a noop when pipeline is not active', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    // pipelineActive is false by default
    await pipeline.cancelCurrentRun();
    expect(deps.emit).not.toHaveBeenCalled();
    expect(getAppState().status).toBe('idle');
  });
});

describe('retryLastRun', () => {
  it('re-polishes lastTranscript with current mode', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    // Set state to completed with a last transcript (simulates end of prior run)
    patchAppState({
      status: 'completed',
      lastTranscript: {
        rawText: 'original text',
        polishedText: '[conversation] original text',
        mode: 'conversation',
        createdAt: new Date().toISOString(),
      },
    });
    deps.emit.mockClear();
    await pipeline.retryLastRun();
    const call = deps.emit.mock.calls.find(([ch]) => ch === IPC_TRANSCRIPT_READY);
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({ rawText: 'original text' });
  });

  it('is a noop when lastTranscript is null', async () => {
    const deps = makeDeps();
    const pipeline = new PipelineService(deps);
    await pipeline.retryLastRun();
    expect(deps.emit).not.toHaveBeenCalled();
  });
});
