import { AppStatus } from '../types/status';

const VALID_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  idle:         ['listening',    'error'],
  listening:    ['transcribing', 'error'],
  transcribing: ['polishing',    'error'],
  polishing:    ['completed',    'error'],
  completed:    ['idle',         'error'],
  error:        ['idle',         'error'],
};

export function canTransition(from: AppStatus, to: AppStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: AppStatus, to: AppStatus): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(from, to);
  }
}

export class TransitionError extends Error {
  constructor(from: AppStatus, to: AppStatus) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = 'TransitionError';
  }
}
