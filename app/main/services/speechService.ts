import { RawTranscript } from '../types/transcript';

export interface SpeechService {
  startCapture(): Promise<void>;
  stopCaptureAndTranscribe(): Promise<RawTranscript>;
}

export class MockSpeechService implements SpeechService {
  private _capturing = false;

  async startCapture(): Promise<void> {
    this._capturing = true;
  }

  async stopCaptureAndTranscribe(): Promise<RawTranscript> {
    this._capturing = false;
    return {
      text: 'Mock transcript from speech service',
      language: 'en',
      durationMs: 1500,
      createdAt: new Date().toISOString(),
    };
  }
}

// Used in failure-path tests
export class FailingSpeechService implements SpeechService {
  async startCapture(): Promise<void> {
    // no-op — failure happens on stop
  }

  async stopCaptureAndTranscribe(): Promise<RawTranscript> {
    throw new Error('Mock speech service failure');
  }
}
