import { getAppState, patchAppState, resetAppState } from '../state/appState';

beforeEach(() => {
  resetAppState();
});

describe('getAppState / patchAppState', () => {
  it('initial state has correct defaults', () => {
    const state = getAppState();
    expect(state.status).toBe('idle');
    expect(state.mode).toBe('conversation');
    expect(state.pipelineActive).toBe(false);
    expect(state.lastTranscript).toBeNull();
  });

  it('patchAppState updates only specified fields', () => {
    patchAppState({ mode: 'coding' });
    const state = getAppState();
    expect(state.mode).toBe('coding');
    expect(state.status).toBe('idle'); // unchanged
    expect(state.pipelineActive).toBe(false); // unchanged
  });

  it('patchAppState sets pipelineActive', () => {
    patchAppState({ pipelineActive: true });
    expect(getAppState().pipelineActive).toBe(true);
  });

  it('patchAppState sets status', () => {
    patchAppState({ status: 'listening' });
    expect(getAppState().status).toBe('listening');
  });

  it('resetAppState reverts to initial defaults', () => {
    patchAppState({ status: 'polishing', mode: 'custom', pipelineActive: true });
    resetAppState();
    const state = getAppState();
    expect(state.status).toBe('idle');
    expect(state.mode).toBe('conversation');
    expect(state.pipelineActive).toBe(false);
    expect(state.lastTranscript).toBeNull();
  });

  it('getAppState returns a readonly snapshot (mutations on copy do not affect state)', () => {
    const snapshot = getAppState() as { status: string };
    snapshot.status = 'polishing';
    // The actual state should be unaffected
    expect(getAppState().status).toBe('idle');
  });
});
