export declare function saveSetting(key: string, value: unknown): Promise<void>;
export declare function getSetting<T = unknown>(key: string): Promise<T | undefined>;
export declare function getAllSettings(): Promise<Record<string, unknown>>;
