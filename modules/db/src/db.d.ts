import BetterSqlite3 from 'better-sqlite3';
export declare function openDatabase(dbPath: string): BetterSqlite3.Database;
export declare function getDatabase(): BetterSqlite3.Database;
export declare function closeDatabase(): void;
export declare function run<T>(fn: (db: BetterSqlite3.Database) => T): Promise<T>;
