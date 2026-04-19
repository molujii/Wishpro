export const SCHEMA_VERSION = 1;

export const CREATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transcripts (
    id            TEXT PRIMARY KEY,
    raw_text      TEXT NOT NULL,
    polished_text TEXT NOT NULL,
    mode          TEXT NOT NULL,
    language      TEXT,
    provider      TEXT NOT NULL,
    duration_ms   INTEGER,
    confidence    REAL,
    created_at    TEXT NOT NULL,
    app_context   TEXT
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
