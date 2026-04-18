import { IpcMainEvent } from 'electron';
import { PipelineService } from '../services/pipelineService';

export class TranscriptionController {
  constructor(private readonly pipeline: PipelineService) {}

  onMicStart(_event: IpcMainEvent): void {
    this.pipeline.startPipeline().catch(console.error);
  }

  onMicStop(_event: IpcMainEvent): void {
    this.pipeline.stopAndTranscribe().catch(console.error);
  }

  onRetryLastRun(_event: IpcMainEvent): void {
    this.pipeline.retryLastRun().catch(console.error);
  }
}
