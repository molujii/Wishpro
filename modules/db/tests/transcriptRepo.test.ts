import { openDatabase, closeDatabase } from '../src/db';
import {
  saveTranscript,
  getRecentTranscripts,
  getTranscript,
  deleteTranscript,
  searchTranscripts,
  filterTranscripts,
} from '../src/transcriptRepo';

const BASE = {
  rawText: 'hello world',
  polishedText: 'Hello world.',
  mode: 'conversation' as const,
  provider: 'mock' as const,
  language: 'en',
};

beforeEach(() => {
  openDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('saveTranscript', () => {
  it('returns record with auto-generated id and createdAt', async () => {
    const rec = await saveTranscript(BASE);
    expect(rec.id).toBeTruthy();
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('preserves explicit id', async () => {
    const rec = await saveTranscript({ ...BASE, id: 'custom-id-123' });
    expect(rec.id).toBe('custom-id-123');
  });

  it('preserves all fields', async () => {
    const rec = await saveTranscript({ ...BASE, durationMs: 1500, confidence: 0.95, appContext: 'VSCode' });
    expect(rec.durationMs).toBe(1500);
    expect(rec.confidence).toBe(0.95);
    expect(rec.appContext).toBe('VSCode');
  });
});

describe('getRecentTranscripts', () => {
  it('returns records sorted newest-first', async () => {
    await saveTranscript({ ...BASE, createdAt: '2024-01-01T00:00:00.000Z' });
    await saveTranscript({ ...BASE, createdAt: '2024-06-01T00:00:00.000Z' });
    const results = await getRecentTranscripts();
    expect(results[0].createdAt).toBe('2024-06-01T00:00:00.000Z');
  });

  it('respects limit', async () => {
    await saveTranscript(BASE);
    await saveTranscript(BASE);
    await saveTranscript(BASE);
    const results = await getRecentTranscripts(2);
    expect(results).toHaveLength(2);
  });

  it('returns empty array when no records', async () => {
    expect(await getRecentTranscripts()).toEqual([]);
  });
});

describe('getTranscript', () => {
  it('returns correct record by id', async () => {
    const saved = await saveTranscript(BASE);
    const fetched = await getTranscript(saved.id);
    expect(fetched?.id).toBe(saved.id);
    expect(fetched?.rawText).toBe(BASE.rawText);
  });

  it('returns undefined for unknown id', async () => {
    expect(await getTranscript('nonexistent')).toBeUndefined();
  });
});

describe('deleteTranscript', () => {
  it('removes record and returns true', async () => {
    const rec = await saveTranscript(BASE);
    expect(await deleteTranscript(rec.id)).toBe(true);
    expect(await getTranscript(rec.id)).toBeUndefined();
  });

  it('returns false for unknown id', async () => {
    expect(await deleteTranscript('nonexistent')).toBe(false);
  });
});

describe('searchTranscripts', () => {
  it('matches text in rawText', async () => {
    await saveTranscript({ ...BASE, rawText: 'unique keyword here', polishedText: 'something else' });
    const results = await searchTranscripts('unique');
    expect(results).toHaveLength(1);
  });

  it('matches text in polishedText', async () => {
    await saveTranscript({ ...BASE, rawText: 'unrelated', polishedText: 'polished result found' });
    const results = await searchTranscripts('polished');
    expect(results).toHaveLength(1);
  });

  it('returns empty array when no match', async () => {
    await saveTranscript(BASE);
    expect(await searchTranscripts('zzznomatch')).toEqual([]);
  });
});

describe('filterTranscripts', () => {
  it('filters by mode', async () => {
    await saveTranscript({ ...BASE, mode: 'coding' });
    await saveTranscript({ ...BASE, mode: 'conversation' });
    const results = await filterTranscripts({ mode: 'coding' });
    expect(results).toHaveLength(1);
    expect(results[0].mode).toBe('coding');
  });

  it('filters by date range', async () => {
    await saveTranscript({ ...BASE, createdAt: '2024-01-15T00:00:00.000Z' });
    await saveTranscript({ ...BASE, createdAt: '2024-06-15T00:00:00.000Z' });
    const results = await filterTranscripts({ fromDate: '2024-03-01T00:00:00.000Z' });
    expect(results).toHaveLength(1);
    expect(results[0].createdAt).toBe('2024-06-15T00:00:00.000Z');
  });

  it('returns all records up to default limit when no filters', async () => {
    await saveTranscript(BASE);
    await saveTranscript(BASE);
    const results = await filterTranscripts({});
    expect(results).toHaveLength(2);
  });
});
