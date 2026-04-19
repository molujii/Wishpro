import { SpeechRawTranscript } from '@modules/speech';

export type TextMode = 'conversation' | 'coding' | 'email' | 'custom';
export type EnhancementLevel = 'light' | 'normal' | 'heavy';
export type TextProviderName = 'mock' | 'ollama' | 'openai' | 'anthropic';

export interface TextPolishRequest {
  rawText: string;
  rawTranscript: SpeechRawTranscript;
  mode: TextMode;
  enhancementLevel?: EnhancementLevel;
}

export interface FinalTranscript {
  rawText: string;
  polishedText: string;
  mode: TextMode;
  confidence?: number;
  createdAt: string;
}

export type TextErrorCode = 'PROVIDER_UNAVAILABLE' | 'POLISH_FAILED' | 'INVALID_INPUT';

export interface TextError {
  code: TextErrorCode;
  message: string;
  retryable: boolean;
}

export interface TextProvider {
  readonly name: TextProviderName;
  polish(request: TextPolishRequest): Promise<string>;
}

export function isTextError(result: FinalTranscript | TextError): result is TextError {
  return 'code' in result && 'retryable' in result;
}
