import type { TranscriptRecord } from './types';
type SaveInput = Omit<TranscriptRecord, 'id' | 'createdAt'> & Partial<Pick<TranscriptRecord, 'id' | 'createdAt'>>;
export declare function saveTranscript(t: SaveInput): Promise<TranscriptRecord>;
export declare function getRecentTranscripts(limit?: number): Promise<TranscriptRecord[]>;
export declare function getTranscript(id: string): Promise<TranscriptRecord | undefined>;
export declare function deleteTranscript(id: string): Promise<boolean>;
export declare function searchTranscripts(query: string, limit?: number): Promise<TranscriptRecord[]>;
export declare function filterTranscripts(opts: {
    mode?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
}): Promise<TranscriptRecord[]>;
export {};
