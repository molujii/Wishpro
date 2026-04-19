"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDatabase = openDatabase;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.run = run;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const migrations_1 = require("./migrations");
let instance = null;
function openDatabase(dbPath) {
    if (instance)
        return instance;
    instance = new better_sqlite3_1.default(dbPath);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    (0, migrations_1.runMigrations)(instance);
    return instance;
}
function getDatabase() {
    if (!instance)
        throw new Error('Database not initialized. Call openDatabase() first.');
    return instance;
}
function closeDatabase() {
    instance?.close();
    instance = null;
}
async function run(fn) {
    try {
        return fn(getDatabase());
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('SQLITE_BUSY')) {
            throw Object.assign(new Error('Database busy'), { code: 'DB_BUSY', retryable: true });
        }
        throw err;
    }
}
