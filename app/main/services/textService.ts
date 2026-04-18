import { RawTranscript, FinalTranscript } from '../types/transcript';
import { AppMode } from '../types/mode';

export interface TextService {
  polishTranscript(input: RawTranscript, mode: AppMode): Promise<FinalTranscript>;
}

export class MockTextService implements TextService {
  async polishTranscript(input: RawTranscript, mode: AppMode): Promise<FinalTranscript> {
    return {
      rawText: input.text,
      polishedText: `[${mode}] ${input.text}`,
      mode,
      language: input.language,
      createdAt: new Date().toISOString(),
    };
  }
}

// Used in failure-path tests
export class FailingTextService implements TextService {
  async polishTranscript(_input: RawTranscript, _mode: AppMode): Promise<FinalTranscript> {
    throw new Error('Mock text service failure');
  }
}
