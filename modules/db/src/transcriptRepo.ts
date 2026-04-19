import { randomUUID } from 'crypto';
import { run } from './db';
import type { TranscriptRecord } from './types';

type SaveInput = Omit<TranscriptRecord, 'id' | 'createdAt'> & Partial<Pick<TranscriptRecord, 'id' | 'createdAt'>>;

export async function saveTranscript(t: SaveInput): Promise<TranscriptRecord> {
  const record: TranscriptRecord = {
    id: t.id ?? randomUUID(),
    createdAt: t.createdAt ?? new Date().toISOString(),
    rawText: t.rawText,
    polishedText: t.polishedText,
    mode: t.mode,
    language: t.language,
    provider: t.provider,
    durationMs: t.durationMs,
    confidence: t.confidence,
    appContext: t.appContext,
  };
  await run(db =>
    db.prepare(`
      INSERT INTO transcripts
        (id, raw_text, polished_text, mode, language, provider, duration_ms, confidence, created_at, app_context)
      VALUES
        (@id, @rawText, @polishedText, @mode, @language, @provider, @durationMs, @confidence, @createdAt, @appContext)
    `).run(record)
  );
  return record;
}

export async function getRecentTranscripts(limit = 20): Promise<TranscriptRecord[]> {
  return run(db =>
    db.prepare(`
      SELECT id, raw_text as rawText, polished_text as polishedText,
             mode, language, provider, duration_ms as durationMs,
             confidence, created_at as createdAt, app_context as appContext
      FROM transcripts ORDER BY created_at DESC LIMIT ?
    `).all(limit) as TranscriptRecord[]
  );
}

export async function getTranscript(id: string): Promise<TranscriptRecord | undefined> {
  return run(db =>
    db.prepare(`
      SELECT id, raw_text as rawText, polished_text as polishedText,
             mode, language, provider, duration_ms as durationMs,
             confidence, created_at as createdAt, app_context as appContext
      FROM transcripts WHERE id = ?
    `).get(id) as TranscriptRecord | undefined
  );
}

export async function deleteTranscript(id: string): Promise<boolean> {
  return run(db => db.prepare('DELETE FROM transcripts WHERE id = ?').run(id).changes > 0);
}

export async function searchTranscripts(query: string, limit = 50): Promise<TranscriptRecord[]> {
  return run(db =>
    db.prepare(`
      SELECT t.id, t.raw_text as rawText, t.polished_text as polishedText,
             t.mode, t.language, t.provider, t.duration_ms as durationMs,
             t.confidence, t.created_at as createdAt, t.app_context as appContext
      FROM transcripts t
      JOIN transcripts_fts fts ON t.rowid = fts.rowid
      WHERE transcripts_fts MATCH ?
      ORDER BY t.created_at DESC LIMIT ?
    `).all(query, limit) as TranscriptRecord[]
  );
}

export async function filterTranscripts(opts: {
  mode?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<TranscriptRecord[]> {
  return run(db => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (opts.mode)     { conditions.push('mode = ?');        params.push(opts.mode); }
    if (opts.fromDate) { conditions.push('created_at >= ?'); params.push(opts.fromDate); }
    if (opts.toDate)   { conditions.push('created_at <= ?'); params.push(opts.toDate); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db.prepare(`
      SELECT id, raw_text as rawText, polished_text as polishedText,
             mode, language, provider, duration_ms as durationMs,
             confidence, created_at as createdAt, app_context as appContext
      FROM transcripts ${where} ORDER BY created_at DESC LIMIT ?
    `).all(...params, opts.limit ?? 50) as TranscriptRecord[];
  });
}
