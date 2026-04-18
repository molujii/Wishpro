import { AppStatus } from '../types/status';
import { AppMode } from '../types/mode';
import { FinalTranscript } from '../types/transcript';

export interface AppStateShape {
  status: AppStatus;
  mode: AppMode;
  pipelineActive: boolean;
  lastTranscript: FinalTranscript | null;
}

const INITIAL_STATE: AppStateShape = {
  status: 'idle',
  mode: 'conversation',
  pipelineActive: false,
  lastTranscript: null,
};

let _state: AppStateShape = { ...INITIAL_STATE };

export function getAppState(): Readonly<AppStateShape> {
  return { ..._state };
}

export function patchAppState(patch: Partial<AppStateShape>): void {
  _state = { ..._state, ...patch };
}

export function resetAppState(): void {
  _state = { ...INITIAL_STATE };
}
