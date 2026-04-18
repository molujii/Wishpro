import { SpeechEngine, TranscriptionResult } from './index';

export class WhisperEngine implements SpeechEngine {
  async transcribe(_audio: Buffer): Promise<TranscriptionResult> {
    // TODO: integrate whisper.cpp subprocess or Python wrapper
    throw new Error('WhisperEngine not yet implemented');
  }
}
