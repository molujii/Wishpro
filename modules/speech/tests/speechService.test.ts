import fs from 'fs';
import os from 'os';
import path from 'path';
import { SpeechModuleService } from '../src/speechService';
import { MockSpeechProvider } from '../src/providers/mockSpeechProvider';
import { isSpeechError, SpeechProvider, SpeechRequest, SpeechRawTranscript } from '../src/types';

describe('SpeechModuleService', () => {
  let tmpWavPath: string;

  beforeAll(() => {
    tmpWavPath = path.join(os.tmpdir(), `whispro-svc-${Date.now()}.wav`);
    fs.writeFileSync(tmpWavPath, Buffer.alloc(0));
  });

  afterAll(() => {
    fs.unlinkSync(tmpWavPath);
  });

  describe('happy path', () => {
    it('returns a SpeechRawTranscript for a valid request', async () => {
      const service = new SpeechModuleService(new MockSpeechProvider());
      const result = await service.transcribe({ audioFilePath: tmpWavPath });
      expect(isSpeechError(result)).toBe(false);
      if (!isSpeechError(result)) {
        expect(result.text).toBeTruthy();
        expect(result.provider).toBe('mock');
      }
    });

    it('preserves the language from the request', async () => {
      const service = new SpeechModuleService(new MockSpeechProvider());
      const result = await service.transcribe({ audioFilePath: tmpWavPath, language: 'es' });
      expect(isSpeechError(result)).toBe(false);
      if (!isSpeechError(result)) {
        expect(result.language).toBe('es');
      }
    });
  });

  describe('validation errors', () => {
    it('returns INVALID_INPUT for a missing file', async () => {
      const service = new SpeechModuleService(new MockSpeechProvider());
      const result = await service.transcribe({ audioFilePath: '/does/not/exist.wav' });
      expect(isSpeechError(result)).toBe(true);
      if (isSpeechError(result)) {
        expect(result.code).toBe('INVALID_INPUT');
        expect(result.retryable).toBe(false);
      }
    });

    it('returns INVALID_INPUT for an unsupported format', async () => {
      const badPath = path.join(os.tmpdir(), `audio-${Date.now()}.txt`);
      fs.writeFileSync(badPath, '');
      const service = new SpeechModuleService(new MockSpeechProvider());
      const result = await service.transcribe({ audioFilePath: badPath });
      fs.unlinkSync(badPath);
      expect(isSpeechError(result)).toBe(true);
      if (isSpeechError(result)) {
        expect(result.code).toBe('INVALID_INPUT');
      }
    });

    it('does NOT call provider.transcribe when validation fails', async () => {
      const provider = new MockSpeechProvider();
      const spy = jest.spyOn(provider, 'transcribe');
      const service = new SpeechModuleService(provider);
      await service.transcribe({ audioFilePath: '/bad/path.wav' });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('provider errors', () => {
    it('returns PROVIDER_FAILED when provider throws', async () => {
      const failingProvider: SpeechProvider = {
        name: 'whisper-cpp',
        async transcribe(_req: SpeechRequest): Promise<SpeechRawTranscript> {
          throw new Error('whisper binary not found');
        },
      };
      const service = new SpeechModuleService(failingProvider);
      const result = await service.transcribe({ audioFilePath: tmpWavPath });
      expect(isSpeechError(result)).toBe(true);
      if (isSpeechError(result)) {
        expect(result.code).toBe('PROVIDER_FAILED');
        expect(result.retryable).toBe(true);
        expect(result.message).toMatch(/whisper binary not found/);
      }
    });
  });

  describe('timeout', () => {
    it('returns TIMEOUT when provider exceeds timeoutMs', async () => {
      const slowProvider = new MockSpeechProvider(500);
      const service = new SpeechModuleService(slowProvider);
      const result = await service.transcribe({ audioFilePath: tmpWavPath, timeoutMs: 50 });
      expect(isSpeechError(result)).toBe(true);
      if (isSpeechError(result)) {
        expect(result.code).toBe('TIMEOUT');
        expect(result.retryable).toBe(true);
      }
    }, 2000);

    it('returns transcript when provider finishes within timeoutMs', async () => {
      const service = new SpeechModuleService(new MockSpeechProvider(0));
      const result = await service.transcribe({ audioFilePath: tmpWavPath, timeoutMs: 5000 });
      expect(isSpeechError(result)).toBe(false);
    });
  });

  describe('isSpeechError type guard', () => {
    it('returns true for SpeechError objects', () => {
      expect(isSpeechError({ code: 'TIMEOUT', message: 'x', retryable: true })).toBe(true);
    });

    it('returns false for SpeechRawTranscript objects', () => {
      expect(
        isSpeechError({ text: 'hello', provider: 'mock', createdAt: new Date().toISOString() }),
      ).toBe(false);
    });
  });
});
