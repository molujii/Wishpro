import { openDatabase, closeDatabase } from '../src/db';
import { saveSetting, getSetting, getAllSettings } from '../src/settingsRepo';

beforeEach(() => {
  openDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('settings', () => {
  it('round-trips a string value', async () => {
    await saveSetting('speech.provider', 'whisper-cpp');
    expect(await getSetting<string>('speech.provider')).toBe('whisper-cpp');
  });

  it('round-trips a number', async () => {
    await saveSetting('some.number', 42);
    expect(await getSetting<number>('some.number')).toBe(42);
  });

  it('round-trips a boolean', async () => {
    await saveSetting('some.flag', true);
    expect(await getSetting<boolean>('some.flag')).toBe(true);
  });

  it('round-trips an object', async () => {
    await saveSetting('some.obj', { a: 1, b: 'two' });
    expect(await getSetting('some.obj')).toEqual({ a: 1, b: 'two' });
  });

  it('returns undefined for unknown key', async () => {
    expect(await getSetting('nonexistent')).toBeUndefined();
  });

  it('overwrites previous value on same key', async () => {
    await saveSetting('ui.theme', 'light');
    await saveSetting('ui.theme', 'dark');
    expect(await getSetting<string>('ui.theme')).toBe('dark');
  });

  it('getAllSettings returns all stored keys', async () => {
    await saveSetting('speech.provider', 'mock');
    await saveSetting('ui.theme', 'system');
    const all = await getAllSettings();
    expect(all['speech.provider']).toBe('mock');
    expect(all['ui.theme']).toBe('system');
  });

  it('getAllSettings returns empty object on fresh DB', async () => {
    expect(await getAllSettings()).toEqual({});
  });
});
