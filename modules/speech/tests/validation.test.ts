import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateSpeechRequest } from '../src/validation';

describe('validateSpeechRequest', () => {
  let tmpWavPath: string;

  beforeAll(() => {
    tmpWavPath = path.join(os.tmpdir(), `whispro-test-${Date.now()}.wav`);
    fs.writeFileSync(tmpWavPath, Buffer.alloc(0));
  });

  afterAll(() => {
    fs.unlinkSync(tmpWavPath);
  });

  it('returns null for a valid request (file exists, .wav extension)', () => {
    expect(validateSpeechRequest({ audioFilePath: tmpWavPath })).toBeNull();
  });

  it('returns INVALID_INPUT when audioFilePath is empty string', () => {
    const err = validateSpeechRequest({ audioFilePath: '' });
    expect(err?.code).toBe('INVALID_INPUT');
    expect(err?.retryable).toBe(false);
  });

  it('returns INVALID_INPUT when audioFilePath is whitespace only', () => {
    const err = validateSpeechRequest({ audioFilePath: '   ' });
    expect(err?.code).toBe('INVALID_INPUT');
  });

  it('returns INVALID_INPUT for an unsupported extension (.txt)', () => {
    const txtPath = path.join(os.tmpdir(), `audio-${Date.now()}.txt`);
    fs.writeFileSync(txtPath, '');
    const err = validateSpeechRequest({ audioFilePath: txtPath });
    fs.unlinkSync(txtPath);
    expect(err?.code).toBe('INVALID_INPUT');
    expect(err?.message).toMatch(/unsupported audio format/i);
  });

  it('returns INVALID_INPUT when file does not exist', () => {
    const err = validateSpeechRequest({ audioFilePath: '/nonexistent/audio.wav' });
    expect(err?.code).toBe('INVALID_INPUT');
    expect(err?.message).toMatch(/not found/i);
  });

  it('returns INVALID_INPUT when timeoutMs is zero', () => {
    const err = validateSpeechRequest({ audioFilePath: tmpWavPath, timeoutMs: 0 });
    expect(err?.code).toBe('INVALID_INPUT');
  });

  it('returns INVALID_INPUT when timeoutMs is negative', () => {
    const err = validateSpeechRequest({ audioFilePath: tmpWavPath, timeoutMs: -500 });
    expect(err?.code).toBe('INVALID_INPUT');
  });

  it('returns null when timeoutMs is a positive number', () => {
    expect(validateSpeechRequest({ audioFilePath: tmpWavPath, timeoutMs: 5000 })).toBeNull();
  });

  it('accepts .mp3, .m4a, .ogg, .flac, .webm extensions', () => {
    for (const ext of ['.mp3', '.m4a', '.ogg', '.flac', '.webm']) {
      const p = path.join(os.tmpdir(), `audio-${Date.now()}${ext}`);
      fs.writeFileSync(p, Buffer.alloc(0));
      expect(validateSpeechRequest({ audioFilePath: p })).toBeNull();
      fs.unlinkSync(p);
    }
  });
});
