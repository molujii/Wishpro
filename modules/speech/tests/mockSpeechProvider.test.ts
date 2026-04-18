import fs from 'fs';
import os from 'os';
import path from 'path';
import { MockSpeechProvider } from '../src/providers/mockSpeechProvider';
import { SpeechRequest } from '../src/types';

describe('MockSpeechProvider', () => {
  let tmpWavPath: string;
  let request: SpeechRequest;

  beforeAll(() => {
    tmpWavPath = path.join(os.tmpdir(), `whispro-mock-${Date.now()}.wav`);
    fs.writeFileSync(tmpWavPath, Buffer.alloc(0));
    request = { audioFilePath: tmpWavPath };
  });

  afterAll(() => {
    fs.unlinkSync(tmpWavPath);
  });

  it('has name property === "mock"', () => {
    expect(new MockSpeechProvider().name).toBe('mock');
  });

  it('returns a SpeechRawTranscript with provider === "mock"', async () => {
    const result = await new MockSpeechProvider().transcribe(request);
    expect(result.provider).toBe('mock');
  });

  it('returns non-empty text', async () => {
    const result = await new MockSpeechProvider().transcribe(request);
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('uses the language from the request when provided', async () => {
    const result = await new MockSpeechProvider().transcribe({ ...request, language: 'fr' });
    expect(result.language).toBe('fr');
  });

  it('defaults language to "en" when not provided', async () => {
    const result = await new MockSpeechProvider().transcribe(request);
    expect(result.language).toBe('en');
  });

  it('returns a valid ISO-8601 createdAt timestamp', async () => {
    const before = new Date().toISOString();
    const result = await new MockSpeechProvider().transcribe(request);
    const after = new Date().toISOString();
    expect(result.createdAt >= before).toBe(true);
    expect(result.createdAt <= after).toBe(true);
  });

  it('returns durationMs as a positive number', async () => {
    const result = await new MockSpeechProvider().transcribe(request);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs!).toBeGreaterThan(0);
  });

  it('returns confidence between 0 and 1', async () => {
    const result = await new MockSpeechProvider().transcribe(request);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence!).toBeLessThanOrEqual(1);
  });
});
