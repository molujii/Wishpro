import { TextProvider, TextPolishRequest, FinalTranscript, TextError } from './types';

export class TextModuleService {
  constructor(private readonly provider: TextProvider) {}

  async polish(request: TextPolishRequest): Promise<FinalTranscript | TextError> {
    if (!request.rawText || !request.rawText.trim()) {
      return {
        code: 'INVALID_INPUT',
        message: 'rawText must be a non-empty string',
        retryable: false,
      };
    }

    try {
      const polishedText = await this.provider.polish(request);
      return {
        rawText: request.rawText,
        polishedText,
        mode: request.mode,
        createdAt: new Date().toISOString(),
      };
    } catch {
      return {
        rawText: request.rawText,
        polishedText: request.rawText,
        mode: request.mode,
        createdAt: new Date().toISOString(),
      };
    }
  }
}
