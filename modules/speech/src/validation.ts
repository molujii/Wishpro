import fs from 'fs';
import path from 'path';
import { SpeechRequest, SpeechError } from './types';

const SUPPORTED_EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.webm']);

export function validateSpeechRequest(request: SpeechRequest): SpeechError | null {
  const { audioFilePath, timeoutMs } = request;

  if (!audioFilePath || typeof audioFilePath !== 'string' || audioFilePath.trim() === '') {
    return {
      code: 'INVALID_INPUT',
      message: 'audioFilePath must be a non-empty string',
      retryable: false,
    };
  }

  const ext = path.extname(audioFilePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      code: 'INVALID_INPUT',
      message: `Unsupported audio format "${ext}". Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`,
      retryable: false,
    };
  }

  if (!fs.existsSync(audioFilePath)) {
    return {
      code: 'INVALID_INPUT',
      message: `Audio file not found: ${audioFilePath}`,
      retryable: false,
    };
  }

  if (timeoutMs !== undefined && (typeof timeoutMs !== 'number' || timeoutMs <= 0)) {
    return {
      code: 'INVALID_INPUT',
      message: 'timeoutMs must be a positive number',
      retryable: false,
    };
  }

  return null;
}
