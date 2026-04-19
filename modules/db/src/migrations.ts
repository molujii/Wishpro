import type BetterSqlite3 from 'better-sqlite3';
import { SCHEMA_VERSION, CREATE_SCHEMA } from './schema';

export function runMigrations(db: BetterSqlite3.Database): void {
  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`)
    .get();

  const current = tableExists
    ? ((db.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: number } | undefined)?.version ?? 0)
    : 0;

  if (current < 1) {
    db.exec(CREATE_SCHEMA);
    const hasRow = db.prepare('SELECT COUNT(*) as cnt FROM schema_version').get() as { cnt: number };
    if (hasRow.cnt === 0) {
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    } else {
      db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION);
    }
  }
  // Future migrations: if (current < 2) { ... }
}
