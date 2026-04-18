import { SpeechProvider, SpeechProviderName, SpeechRequest, SpeechRawTranscript } from '../types';

export class MockSpeechProvider implements SpeechProvider {
  readonly name: SpeechProviderName = 'mock';

  constructor(private readonly delayMs: number = 0) {}

  async transcribe(request: SpeechRequest): Promise<SpeechRawTranscript> {
    if (this.delayMs > 0) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, this.delayMs);
        t.unref?.();
      });
    }

    return {
      text: 'Mock transcript from speech module',
      language: request.language ?? 'en',
      durationMs: 1500,
      confidence: 0.95,
      provider: this.name,
      createdAt: new Date().toISOString(),
    };
  }
}
