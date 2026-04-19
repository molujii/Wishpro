import BetterSqlite3 from 'better-sqlite3';
import { runMigrations } from './migrations';

let instance: BetterSqlite3.Database | null = null;

export function openDatabase(dbPath: string): BetterSqlite3.Database {
  if (instance) return instance;
  instance = new BetterSqlite3(dbPath);
  instance.pragma('journal_mode = WAL');
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

export async function run<T>(fn: (db: BetterSqlite3.Database) => T): Promise<T> {
  try {
    return fn(getDatabase());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('SQLITE_BUSY')) {
      throw Object.assign(new Error('Database busy'), { code: 'DB_BUSY', retryable: true });
    }
    throw err;
  }
}
