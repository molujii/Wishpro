"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const schema_1 = require("./schema");
function runMigrations(db) {
    const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`)
        .get();
    const current = tableExists
        ? (db.prepare('SELECT version FROM schema_version LIMIT 1').get()?.version ?? 0)
        : 0;
    if (current < 1) {
        db.exec(schema_1.CREATE_SCHEMA);
        const hasRow = db.prepare('SELECT COUNT(*) as cnt FROM schema_version').get();
        if (hasRow.cnt === 0) {
            db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(schema_1.SCHEMA_VERSION);
        }
        else {
            db.prepare('UPDATE schema_version SET version = ?').run(schema_1.SCHEMA_VERSION);
        }
    }
    // Future migrations: if (current < 2) { ... }
}
