export interface Transcript {
  id: number;
  text: string;
  mode: string;
  createdAt: string;
  language: string;
}

export interface UserSettings {
  hotkey: string;
  defaultMode: string;
  speechEngine: 'whisper-local' | 'openai-whisper';
  textEngine: 'ollama' | 'openai' | 'claude' | 'none';
}

export { Database } from './database';
