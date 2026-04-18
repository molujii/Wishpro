import { canTransition, assertTransition, TransitionError } from '../state/stateMachine';
import { AppStatus } from '../types/status';

describe('canTransition', () => {
  it('idle → listening is valid', () => {
    expect(canTransition('idle', 'listening')).toBe(true);
  });

  it('listening → transcribing is valid', () => {
    expect(canTransition('listening', 'transcribing')).toBe(true);
  });

  it('transcribing → polishing is valid', () => {
    expect(canTransition('transcribing', 'polishing')).toBe(true);
  });

  it('polishing → completed is valid', () => {
    expect(canTransition('polishing', 'completed')).toBe(true);
  });

  it('completed → idle is valid', () => {
    expect(canTransition('completed', 'idle')).toBe(true);
  });

  it('error → idle is valid', () => {
    expect(canTransition('error', 'idle')).toBe(true);
  });

  const allStatuses: AppStatus[] = ['idle', 'listening', 'transcribing', 'polishing', 'completed', 'error'];
  it.each(allStatuses)('%s → error is valid', (from) => {
    expect(canTransition(from, 'error')).toBe(true);
  });

  it('listening → listening is invalid (duplicate-start guard)', () => {
    expect(canTransition('listening', 'listening')).toBe(false);
  });

  it('transcribing → listening is invalid', () => {
    expect(canTransition('transcribing', 'listening')).toBe(false);
  });

  it('polishing → listening is invalid', () => {
    expect(canTransition('polishing', 'listening')).toBe(false);
  });

  it('idle → completed is invalid', () => {
    expect(canTransition('idle', 'completed')).toBe(false);
  });
});

describe('assertTransition', () => {
  it('does not throw for valid transition', () => {
    expect(() => assertTransition('idle', 'listening')).not.toThrow();
  });

  it('throws TransitionError for invalid transition', () => {
    expect(() => assertTransition('listening', 'listening')).toThrow(TransitionError);
  });

  it('TransitionError message includes from and to labels', () => {
    try {
      assertTransition('transcribing', 'idle');
    } catch (e) {
      expect(e).toBeInstanceOf(TransitionError);
      expect((e as TransitionError).message).toContain('transcribing');
      expect((e as TransitionError).message).toContain('idle');
    }
  });
});
