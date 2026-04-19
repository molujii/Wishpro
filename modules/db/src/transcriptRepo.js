"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveTranscript = saveTranscript;
exports.getRecentTranscripts = getRecentTranscripts;
exports.getTranscript = getTranscript;
exports.deleteTranscript = deleteTranscript;
exports.searchTranscripts = searchTranscripts;
exports.filterTranscripts = filterTranscripts;
const crypto_1 = require("crypto");
const db_1 = require("./db");
async function saveTranscript(t) {
    const record = {
        id: t.id ?? (0, crypto_1.randomUUID)(),
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
    await (0, db_1.run)(db => db.prepare(`
      INSERT INTO transcripts
        (id, raw_text, polished_text, mode, language, provider, duration_ms, confidence, created_at, app_context)
      VALUES
        (@id, @rawText, @polishedText, @mode, @language, @provider, @durationMs, @confidence, @createdAt, @appContext)
    `).run(record));
    return record;
}
async function getRecentTranscripts(limit = 20) {
    return (0, db_1.run)(db => db.prepare(`
      SELECT id, raw_text as rawText, polished_text as polishedText,
             mode, language, provider, duration_ms as durationMs,
             confidence, created_at as createdAt, app_context as appContext
      FROM transcripts ORDER BY created_at DESC LIMIT ?
    `).all(limit));
}
async function getTranscript(id) {
    return (0, db_1.run)(db => db.prepare(`
      SELECT id, raw_text as rawText, polished_text as polishedText,
             mode, language, provider, duration_ms as durationMs,
             confidence, created_at as createdAt, app_context as appContext
      FROM transcripts WHERE id = ?
    `).get(id));
}
async function deleteTranscript(id) {
    return (0, db_1.run)(db => db.prepare('DELETE FROM transcripts WHERE id = ?').run(id).changes > 0);
}
async function searchTranscripts(query, limit = 50) {
    return (0, db_1.run)(db => db.prepare(`
      SELECT t.id, t.raw_text as rawText, t.polished_text as polishedText,
             t.mode, t.language, t.provider, t.duration_ms as durationMs,
             t.confidence, t.created_at as createdAt, t.app_context as appContext
      FROM transcripts t
      JOIN transcripts_fts fts ON t.rowid = fts.rowid
      WHERE transcripts_fts MATCH ?
      ORDER BY t.created_at DESC LIMIT ?
    `).all(query, limit));
}
async function filterTranscripts(opts) {
    return (0, db_1.run)(db => {
        const conditions = [];
        const params = [];
        if (opts.mode) {
            conditions.push('mode = ?');
            params.push(opts.mode);
        }
        if (opts.fromDate) {
            conditions.push('created_at >= ?');
            params.push(opts.fromDate);
        }
        if (opts.toDate) {
            conditions.push('created_at <= ?');
            params.push(opts.toDate);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        return db.prepare(`
      SELECT id, raw_text as rawText, polished_text as polishedText,
             mode, language, provider, duration_ms as durationMs,
             confidence, created_at as createdAt, app_context as appContext
      FROM transcripts ${where} ORDER BY created_at DESC LIMIT ?
    `).all(...params, opts.limit ?? 50);
    });
}
