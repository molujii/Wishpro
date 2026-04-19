import { AppMode } from './mode';
import { AppStatus } from './status';

export type ModeChangePayload = { mode: AppMode };
export type StatusChangePayload = { status: AppStatus };
export type TranscriptReadyPayload = {
  rawText: string;
  polishedText: string;
  mode: AppMode;
  createdAt: string;
};
export type ErrorPayload = { message: string; code?: string };
export type LogEventPayload = {
  level: 'info' | 'warn' | 'error';
  message: string;
  ts: string;
};

export interface AppStateSnapshot {
  status: AppStatus;
  mode: AppMode;
  pipelineActive: boolean;
  lastTranscript: TranscriptReadyPayload | null;
}

// Module 9: auto-updater
export type UpdateStatusKind =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateStatusPayload {
  status: UpdateStatusKind;
  version?: string;
  percent?: number;
  message?: string;
}
