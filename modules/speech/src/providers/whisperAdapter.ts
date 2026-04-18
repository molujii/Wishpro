import { SpeechProvider, SpeechProviderName, SpeechRequest, SpeechRawTranscript } from '../types';

/**
 * Scaffold for local whisper.cpp / whisper-python integration.
 *
 * Phase 2 implementation will:
 *   - Spawn a child_process running whisper.cpp or a Python wrapper
 *   - Pass audioFilePath as a CLI argument
 *   - Parse JSON output from stdout
 *   - Honour timeoutMs via AbortController / process.kill
 */
export class WhisperAdapter implements SpeechProvider {
  readonly name: SpeechProviderName = 'whisper-cpp';

  constructor(
    private readonly modelPath: string,
    private readonly execPath: string = 'whisper-cpp',
  ) {}

  async transcribe(_request: SpeechRequest): Promise<SpeechRawTranscript> {
    throw new Error(
      `WhisperAdapter(${this.execPath}) is not yet implemented. Model: ${this.modelPath}`,
    );
  }
}
