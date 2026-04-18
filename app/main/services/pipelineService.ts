import { SpeechService } from './speechService';
import { TextService } from './textService';
import { Logger } from './logger';
import { AppStateShape } from '../state/appState';
import { assertTransition, TransitionError } from '../state/stateMachine';
import { AppStatus } from '../types/status';
import { AppMode } from '../types/mode';
import { FinalTranscript } from '../types/transcript';
import {
  IPC_STATUS_CHANGE,
  IPC_TRANSCRIPT_READY,
  IPC_ERROR,
} from '../ipc/channels';
import { TranscriptReadyPayload } from '../types/ipc';

type EmitFn = (channel: string, payload: unknown) => void;

export interface PipelineDeps {
  speechService: SpeechService;
  textService: TextService;
  logger: Logger;
  emit: EmitFn;
  getState: () => Readonly<AppStateShape>;
  patchState: (p: Partial<AppStateShape>) => void;
}

export class PipelineService {
  constructor(private deps: PipelineDeps) {}

  async startPipeline(): Promise<void> {
    const { logger, speechService } = this.deps;
    const state = this.deps.getState();

    if (state.pipelineActive) {
      logger.warn('Duplicate start ignored — pipeline already active');
      return;
    }

    this.deps.patchState({ pipelineActive: true });
    this.transitionTo('listening');
    logger.info('Pipeline started — listening');

    await speechService.startCapture();
  }

  async stopAndTranscribe(): Promise<void> {
    const { logger, speechService, textService } = this.deps;
    const state = this.deps.getState();

    if (!state.pipelineActive) {
      logger.warn('stopAndTranscribe called but pipeline not active — ignoring');
      return;
    }

    try {
      this.transitionTo('transcribing');
      logger.info('Speech capture stopped — transcribing');

      const raw = await speechService.stopCaptureAndTranscribe();
      logger.info('Speech transcription complete');

      this.transitionTo('polishing');
      logger.info('Polishing transcript');

      const mode: AppMode = this.deps.getState().mode;
      const final: FinalTranscript = await textService.polishTranscript(raw, mode);
      logger.info('Text polishing complete');

      this.transitionTo('completed');

      const payload: TranscriptReadyPayload = {
        rawText: final.rawText,
        polishedText: final.polishedText,
        mode: final.mode,
        createdAt: final.createdAt,
      };

      this.deps.patchState({ pipelineActive: false, lastTranscript: final });
      this.deps.emit(IPC_TRANSCRIPT_READY, payload);
      logger.info('Transcript emitted to renderer');
    } catch (err) {
      this.handleError(err);
    }
  }

  async retryLastRun(): Promise<void> {
    const { logger, textService } = this.deps;
    const state = this.deps.getState();

    if (!state.lastTranscript) {
      logger.warn('retryLastRun called but no previous transcript — ignoring');
      return;
    }

    try {
      // Reset to idle first so we can re-enter polishing via the pipeline
      this.transitionTo('idle');
      this.transitionTo('listening');
      this.transitionTo('transcribing');
      this.transitionTo('polishing');
      logger.info('Retrying last run — re-polishing transcript');

      const mode: AppMode = this.deps.getState().mode;
      const raw = {
        text: state.lastTranscript.rawText,
        language: state.lastTranscript.language,
        createdAt: state.lastTranscript.createdAt,
      };

      const final: FinalTranscript = await textService.polishTranscript(raw, mode);
      this.transitionTo('completed');

      const payload: TranscriptReadyPayload = {
        rawText: final.rawText,
        polishedText: final.polishedText,
        mode: final.mode,
        createdAt: final.createdAt,
      };

      this.deps.patchState({ lastTranscript: final });
      this.deps.emit(IPC_TRANSCRIPT_READY, payload);
      logger.info('Retry transcript emitted');
    } catch (err) {
      this.handleError(err);
    }
  }

  async cancelCurrentRun(): Promise<void> {
    const { logger } = this.deps;
    const state = this.deps.getState();

    if (!state.pipelineActive) {
      logger.warn('cancelCurrentRun called but pipeline not active — ignoring');
      return;
    }

    logger.warn('Pipeline cancelled by user');
    this.handleError(new Error('Pipeline cancelled'));
  }

  private transitionTo(next: AppStatus): void {
    const current = this.deps.getState().status;
    try {
      assertTransition(current, next);
      this.deps.patchState({ status: next });
      this.deps.emit(IPC_STATUS_CHANGE, { status: next });
    } catch (err) {
      if (err instanceof TransitionError) {
        this.deps.logger.error(err.message);
        // Force into error state without going through assertTransition again
        this.deps.patchState({ status: 'error', pipelineActive: false });
        this.deps.emit(IPC_STATUS_CHANGE, { status: 'error' });
        this.deps.emit(IPC_ERROR, { message: 'An unexpected state error occurred.' });
        throw err;
      }
      throw err;
    }
  }

  private handleError(err: unknown): void {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    this.deps.logger.error(`Pipeline error: ${message}`);
    this.deps.patchState({ status: 'error', pipelineActive: false });
    this.deps.emit(IPC_STATUS_CHANGE, { status: 'error' });
    this.deps.emit(IPC_ERROR, { message: getSafeErrorMessage(err) });
  }
}

function getSafeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'An unexpected error occurred.';
  const msg = err.message.toLowerCase();
  if (msg.includes('speech') || msg.includes('capture') || msg.includes('transcri')) {
    return 'Transcription failed. Please try again.';
  }
  if (msg.includes('polish') || msg.includes('text')) {
    return 'Text polishing failed. Showing raw transcript instead.';
  }
  if (msg.includes('cancel')) {
    return 'Recording was cancelled.';
  }
  return 'Something went wrong. Please try again.';
}
