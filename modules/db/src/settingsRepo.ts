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
