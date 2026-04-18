export type {
  SpeechProviderName,
  SpeechRequest,
  SpeechRawTranscript,
  SpeechErrorCode,
  SpeechError,
  SpeechProvider,
} from './types';

export { isSpeechError } from './types';
export { SpeechModuleService } from './speechService';
export { MockSpeechProvider } from './providers/mockSpeechProvider';
export { WhisperAdapter } from './providers/whisperAdapter';
export { validateSpeechRequest } from './validation';
