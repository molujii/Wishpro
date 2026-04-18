import { SpeechProvider, SpeechRequest, SpeechRawTranscript, SpeechError } from './types';
import { validateSpeechRequest } from './validation';

export class SpeechModuleService {
  constructor(private readonly provider: SpeechProvider) {}

  async transcribe(request: SpeechRequest): Promise<SpeechRawTranscript | SpeechError> {
    const validationError = validateSpeechRequest(request);
    if (validationError) return validationError;

    if (request.timeoutMs !== undefined && request.timeoutMs > 0) {
      return this.transcribeWithTimeout(request, request.timeoutMs);
    }

    return this.callProvider(request);
  }

  private async transcribeWithTimeout(
    request: SpeechRequest,
    timeoutMs: number,
  ): Promise<SpeechRawTranscript | SpeechError> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<SpeechError>((resolve) => {
      timer = setTimeout(() => {
        resolve({
          code: 'TIMEOUT',
          message: `Transcription timed out after ${timeoutMs}ms`,
          retryable: true,
        });
      }, timeoutMs);
    });

    const result = await Promise.race([this.callProvider(request), timeoutPromise]);
    clearTimeout(timer);
    return result;
  }

  private async callProvider(request: SpeechRequest): Promise<SpeechRawTranscript | SpeechError> {
    try {
      return await this.provider.transcribe(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown provider error';
      return {
        code: 'PROVIDER_FAILED',
        message,
        retryable: true,
      };
    }
  }
}
