"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSetting = saveSetting;
exports.getSetting = getSetting;
exports.getAllSettings = getAllSettings;
const db_1 = require("./db");
async function saveSetting(key, value) {
    await (0, db_1.run)(db => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value)));
}
async function getSetting(key) {
    return (0, db_1.run)(db => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? JSON.parse(row.value) : undefined;
    });
}
async function getAllSettings() {
    return (0, db_1.run)(db => {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
    });
}
