import { openDatabase, closeDatabase } from '../src/db';
import { SCHEMA_VERSION } from '../src/schema';
import BetterSqlite3 from 'better-sqlite3';

let db: BetterSqlite3.Database;

beforeEach(() => {
  db = openDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('migrations', () => {
  it('sets schema_version to SCHEMA_VERSION after fresh open', () => {
    const row = db.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: number };
    expect(row.version).toBe(SCHEMA_VERSION);
  });

  it('creates all required tables', () => {
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' OR type='shadow'`)
      .all()
      .map((r: unknown) => (r as { name: string }).name);

    expect(tables).toContain('transcripts');
    expect(tables).toContain('settings');
    expect(tables).toContain('schema_version');
  });

  it('creates the FTS virtual table', () => {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='transcripts_fts'`)
      .get();
    expect(row).toBeTruthy();
  });

  it('running openDatabase a second time is idempotent (no error)', () => {
    expect(() => openDatabase(':memory:')).not.toThrow();
  });
});
