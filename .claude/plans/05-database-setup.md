# Module 5 — Database — Implementation Plan

## Context

Modules 1–4 (Frontend, Backend, Speech, Text) are implemented. The backend pipeline can transcribe and polish speech but has no persistence — transcripts are lost between sessions and settings reset on restart. Module 5 builds the `modules/db/` layer using `better-sqlite3` (already installed) to provide durable, non-blocking transcript storage and settings persistence behind a clean async API.

A skeleton already exists in `modules/db/src/database.ts` and `modules/db/src/index.ts` but uses a simplified schema (plain `text` column, no `rawText`/`polishedText` split, no FTS, no migrations). This module **replaces** that skeleton with the full spec-compliant implementation.

---

## Target Folder Structure

```
modules/db/
├── src/
│   ├── index.ts           REWRITE — public API exports
│   ├── types.ts           CREATE  — all shared types
│   ├── schema.ts          CREATE  — CREATE TABLE + FTS statements
│   ├── migrations.ts      CREATE  — version-tracked migration runner
│   ├── db.ts              CREATE  — DB singleton, open/close, async wrapper
│   ├── transcriptRepo.ts  CREATE  — transcript CRUD + search
│   └── settingsRepo.ts    CREATE  — key/value settings helpers
└── tests/
    ├── transcriptRepo.test.ts  CREATE
    ├── settingsRepo.test.ts    CREATE
    └── migrations.test.ts      CREATE
```

**DELETE:** `modules/db/src/database.ts` (replaced by `db.ts` + repos)

**DO NOT TOUCH:** Any file outside `modules/db/`.

---

## Types (`modules/db/src/types.ts`)

```ts
import type { TextMode } from '@modules/text';
import type { SpeechProviderName } from '@modules/speech';

export interface TranscriptRecord {
  id: string;               // UUID v4
  rawText: string;
  polishedText: string;
  mode: TextMode;
  language?: string;
  provider: SpeechProviderName;
  durationMs?: number;
  confidence?: number;
  createdAt: string;        // ISO-8601
  appContext?: string;      // e.g. "VSCode"
}

export interface SettingRecord {
  key: string;
  value: string;            // JSON-stringified
}

export type KnownSettingKey =
  | 'speech.provider'
  | 'speech.language'
  | 'text.mode'
  | 'text.enhancement'
  | 'ui.theme'
  | 'hotkey.trigger';
```

---

## Schema (`modules/db/src/schema.ts`)

```ts
export const SCHEMA_VERSION = 1;

export const CREATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transcripts (
    id          TEXT PRIMARY KEY,
    raw_text    TEXT NOT NULL,
    polished_text TEXT NOT NULL,
    mode        TEXT NOT NULL,
    language    TEXT,
    provider    TEXT NOT NULL,
    duration_ms INTEGER,
    confidence  REAL,
    created_at  TEXT NOT NULL,
    app_context TEXT
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts
    USING fts5(raw_text, polished_text, content='transcripts', content_rowid='rowid');

  CREATE TRIGGER IF NOT EXISTS transcripts_ai AFTER INSERT ON transcripts BEGIN
    INSERT INTO transcripts_fts(rowid, raw_text, polished_text)
    VALUES (new.rowid, new.raw_text, new.polished_text);
  END;

  CREATE TRIGGER IF NOT EXISTS transcripts_ad AFTER DELETE ON transcripts BEGIN
    INSERT INTO transcripts_fts(transcripts_fts, rowid, raw_text, polished_text)
    VALUES ('delete', old.rowid, old.raw_text, old.polished_text);
  END;

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
```

---

## Migrations (`modules/db/src/migrations.ts`)

```ts
import type BetterSqlite3 from 'better-sqlite3';
import { SCHEMA_VERSION, CREATE_SCHEMA } from './schema';

export function runMigrations(db: BetterSqlite3.Database): void {
  const versionRow = db.prepare('SELECT version FROM schema_version LIMIT 1').get() as
    | { version: number }
    | undefined;
  const current = versionRow?.version ?? 0;

  if (current < 1) {
    db.exec(CREATE_SCHEMA);
    if (current === 0) {
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    } else {
      db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION);
    }
  }
  // Future migrations: if (current < 2) { ... }
}
```

---

## DB Core (`modules/db/src/db.ts`)

```ts
import BetterSqlite3 from 'better-sqlite3';
import { runMigrations } from './migrations';

let instance: BetterSqlite3.Database | null = null;

export function openDatabase(dbPath: string): BetterSqlite3.Database {
  if (instance) return instance;
  instance = new BetterSqlite3(dbPath);
  instance.pragma('journal_mode = WAL');   // concurrent reads
  instance.pragma('foreign_keys = ON');
  runMigrations(instance);
  return instance;
}

export function getDatabase(): BetterSqlite3.Database {
  if (!instance) throw new Error('Database not initialized. Call openDatabase() first.');
  return instance;
}

export function closeDatabase(): void {
  instance?.close();
  instance = null;
}

// Wraps synchronous better-sqlite3 calls in a Promise so callers always use await.
export async function run<T>(fn: (db: BetterSqlite3.Database) => T): Promise<T> {
  try {
    return fn(getDatabase());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // DB locked → surface as structured error; disk full → warn and rethrow
    if (msg.includes('SQLITE_BUSY')) {
      throw Object.assign(new Error('Database busy'), { code: 'DB_BUSY', retryable: true });
    }
    throw err;
  }
}
```

---

## Transcript Repository (`modules/db/src/transcriptRepo.ts`)

```ts
import { randomUUID } from 'crypto';
import { run } from './db';
import type { TranscriptRecord } from './types';

export async function saveTranscript(t: Omit<TranscriptRecord, 'id' | 'createdAt'> & Partial<Pick<TranscriptRecord, 'id' | 'createdAt'>>): Promise<TranscriptRecord> {
  const record: TranscriptRecord = {
    id: t.id ?? randomUUID(),
    createdAt: t.createdAt ?? new Date().toISOString(),
    ...t,
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
    if (opts.mode)     { conditions.push('mode = ?');       params.push(opts.mode); }
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
```

---

## Settings Repository (`modules/db/src/settingsRepo.ts`)

```ts
import { run } from './db';

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await run(db =>
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value))
  );
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  return run(db => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : undefined;
  });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  return run(db => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
  });
}
```

---

## Public API (`modules/db/src/index.ts` — REWRITE)

```ts
export type { TranscriptRecord, SettingRecord, KnownSettingKey } from './types';
export { openDatabase, closeDatabase, getDatabase } from './db';
export {
  saveTranscript, getRecentTranscripts, getTranscript,
  deleteTranscript, searchTranscripts, filterTranscripts,
} from './transcriptRepo';
export { saveSetting, getSetting, getAllSettings } from './settingsRepo';
```

---

## Implementation Order

| Step | File | Action |
|------|------|--------|
| 1 | `modules/db/src/types.ts` | CREATE |
| 2 | `modules/db/src/schema.ts` | CREATE |
| 3 | `modules/db/src/migrations.ts` | CREATE |
| 4 | `modules/db/src/db.ts` | CREATE |
| 5 | `modules/db/src/transcriptRepo.ts` | CREATE |
| 6 | `modules/db/src/settingsRepo.ts` | CREATE |
| 7 | `modules/db/src/index.ts` | REWRITE |
| 8 | `modules/db/src/database.ts` | DELETE |
| 9 | `modules/db/tests/transcriptRepo.test.ts` | CREATE |
| 10 | `modules/db/tests/settingsRepo.test.ts` | CREATE |
| 11 | `modules/db/tests/migrations.test.ts` | CREATE |

---

## Tests

### `transcriptRepo.test.ts` — ~14 tests
- `saveTranscript()` returns record with auto-generated `id` and `createdAt`
- `saveTranscript()` with explicit `id` preserves it
- `getRecentTranscripts()` returns records sorted newest-first
- `getRecentTranscripts(limit)` respects limit
- `getTranscript(id)` returns correct record
- `getTranscript(unknown)` returns `undefined`
- `deleteTranscript(id)` removes record, returns `true`
- `deleteTranscript(unknown)` returns `false`
- `searchTranscripts(query)` matches text in `rawText`
- `searchTranscripts(query)` matches text in `polishedText`
- `searchTranscripts(noMatch)` returns empty array
- `filterTranscripts({ mode })` filters by mode
- `filterTranscripts({ fromDate, toDate })` filters by date range
- `filterTranscripts({})` returns all up to default limit

### `settingsRepo.test.ts` — ~6 tests
- `saveSetting` + `getSetting` round-trips a string value
- `getSetting` parses JSON (number, boolean, object)
- `getSetting(unknown)` returns `undefined`
- `saveSetting` on same key overwrites previous value
- `getAllSettings()` returns all stored keys
- `getAllSettings()` on empty DB returns `{}`

### `migrations.test.ts` — ~3 tests
- Fresh DB: `schema_version` row equals `SCHEMA_VERSION`
- All tables exist after migration (`transcripts`, `settings`, `schema_version`, `transcripts_fts`)
- Running migrations twice is idempotent (no error)

---

## Backend Contract (ready to use after this module)

```ts
import { openDatabase, saveTranscript, getRecentTranscripts, getSetting } from '@modules/db';

openDatabase(path.join(app.getPath('userData'), 'whisppro.db'));

await saveTranscript({ rawText, polishedText, mode, provider, language });
const history = await getRecentTranscripts(20);
const speechProvider = await getSetting<string>('speech.provider') ?? 'mock';
```

---

## Verification

```bash
# 1. TypeScript — whole project
npx tsc --noEmit

# 2. Database module tests only
npx jest --testPathPattern="modules/db" --verbose
# Expected: 3 suites, ~23 tests, all pass

# 3. Full test suite — confirm Modules 2–4 tests still green
npx jest --verbose

# 4. Lint
npx eslint 'modules/db/**/*.ts'
# Expected: 0 errors
```
