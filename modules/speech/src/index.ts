export interface TranscriptionResult {
  text: string;
  language: string;
  durationMs: number;
}

export interface SpeechEngine {
  transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;
}

export { WhisperEngine } from './whisperEngine';
