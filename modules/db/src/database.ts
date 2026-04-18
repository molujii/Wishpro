import BetterSqlite3 from 'better-sqlite3';
import { Transcript } from './index';

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'conversation',
        language TEXT NOT NULL DEFAULT 'en',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  saveTranscript(text: string, mode: string, language: string): number {
    const stmt = this.db.prepare(
      'INSERT INTO transcripts (text, mode, language) VALUES (?, ?, ?)'
    );
    return Number(stmt.run(text, mode, language).lastInsertRowid);
  }

  getTranscripts(limit = 50): Transcript[] {
    return this.db
      .prepare('SELECT id, text, mode, language, created_at as createdAt FROM transcripts ORDER BY id DESC LIMIT ?')
      .all(limit) as Transcript[];
  }

  getSetting(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  close(): void {
    this.db.close();
  }
}
