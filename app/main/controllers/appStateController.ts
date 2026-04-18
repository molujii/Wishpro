import { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { AppStateShape } from '../state/appState';
import { PipelineService } from '../services/pipelineService';
import { AppStateSnapshot, ModeChangePayload } from '../types/ipc';
import { AppMode } from '../types/mode';

export class AppStateController {
  constructor(
    private readonly getState: () => Readonly<AppStateShape>,
    private readonly patchState: (p: Partial<AppStateShape>) => void,
    private readonly pipeline: PipelineService,
  ) {}

  onGetAppState(_event: IpcMainInvokeEvent): AppStateSnapshot {
    const state = this.getState();
    return {
      status: state.status,
      mode: state.mode,
      pipelineActive: state.pipelineActive,
      lastTranscript: state.lastTranscript
        ? {
            rawText: state.lastTranscript.rawText,
            polishedText: state.lastTranscript.polishedText,
            mode: state.lastTranscript.mode,
            createdAt: state.lastTranscript.createdAt,
          }
        : null,
    };
  }

  onModeChange(_event: IpcMainEvent, payload: ModeChangePayload): void {
    const validModes: AppMode[] = ['conversation', 'coding', 'custom'];
    if (!validModes.includes(payload?.mode)) {
      console.warn(`[WARN] Invalid mode received: ${payload?.mode}`);
      return;
    }
    this.patchState({ mode: payload.mode });
  }

  onCancelCurrentRun(_event: IpcMainEvent): void {
    this.pipeline.cancelCurrentRun().catch(console.error);
  }
}
