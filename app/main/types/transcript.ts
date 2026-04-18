import { AppMode } from './mode';

export interface RawTranscript {
  text: string;
  language?: string;
  durationMs?: number;
  createdAt: string; // ISO-8601
}

export interface FinalTranscript {
  rawText: string;
  polishedText: string;
  mode: AppMode;
  language?: string;
  createdAt: string;
}
