export type TextMode = 'conversation' | 'coding' | 'email' | 'custom';
export type SpeechProviderName = 'mock' | 'whisper-cpp' | 'openai-whisper' | 'parakeet';

export interface TranscriptRecord {
  id: string;
  rawText: string;
  polishedText: string;
  mode: TextMode;
  language?: string;
  provider: SpeechProviderName;
  durationMs?: number;
  confidence?: number;
  createdAt: string;
  appContext?: string;
}

export interface SettingRecord {
  key: string;
  value: string;
}

export type KnownSettingKey =
  | 'speech.provider'
  | 'speech.language'
  | 'text.mode'
  | 'text.enhancement'
  | 'ui.theme'
  | 'hotkey.trigger';
