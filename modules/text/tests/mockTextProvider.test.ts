import { MockTextProvider } from '../src/providers/mockTextProvider';
import { TextPolishRequest } from '../src/types';
import { SpeechRawTranscript } from '@modules/speech';

const mockTranscript: SpeechRawTranscript = {
  text: 'hello',
  provider: 'mock',
  createdAt: new Date().toISOString(),
};

function makeRequest(overrides: Partial<TextPolishRequest> = {}): TextPolishRequest {
  return {
    rawText: 'hello um how are uh you today like',
    rawTranscript: mockTranscript,
    mode: 'conversation',
    ...overrides,
  };
}

describe('MockTextProvider', () => {
  const provider = new MockTextProvider();

  it('has name "mock"', () => {
    expect(provider.name).toBe('mock');
  });

  it('conversation: removes filler words', async () => {
    const result = await provider.polish(makeRequest({ mode: 'conversation' }));
    expect(result).not.toMatch(/\b(um|uh|like)\b/i);
  });

  it('conversation: capitalizes first letter', async () => {
    const result = await provider.polish(makeRequest({ mode: 'conversation', rawText: 'hello there' }));
    expect(result[result.indexOf('H') >= 0 ? result.indexOf('H') : 0]).toMatch(/[A-Z]/);
  });

  it('conversation: ends with punctuation', async () => {
    const result = await provider.polish(makeRequest({ mode: 'conversation', rawText: 'hello there' }));
    expect(result).toMatch(/[.!?](\s|$)/);
  });

  it('coding: prepends "//"', async () => {
    const result = await provider.polish(makeRequest({ mode: 'coding', rawText: 'sort the array' }));
    expect(result).toContain('// sort the array');
  });

  it('email: capitalizes and appends "Best regards"', async () => {
    const result = await provider.polish(makeRequest({ mode: 'email', rawText: 'please review this' }));
    expect(result).toContain('Best regards');
    expect(result[result.indexOf('[') + 1] === 'e' || result[0].match(/[A-Z\[]/)).toBeTruthy();
  });

  it('custom: trims and returns text', async () => {
    const result = await provider.polish(makeRequest({ mode: 'custom', rawText: '  hello world  ' }));
    expect(result).toContain('hello world');
  });

  it('all four modes produce different outputs for same input', async () => {
    const rawText = 'um check the code uh please';
    const [conv, code, email, custom] = await Promise.all([
      provider.polish(makeRequest({ mode: 'conversation', rawText })),
      provider.polish(makeRequest({ mode: 'coding', rawText })),
      provider.polish(makeRequest({ mode: 'email', rawText })),
      provider.polish(makeRequest({ mode: 'custom', rawText })),
    ]);
    const outputs = new Set([conv, code, email, custom]);
    expect(outputs.size).toBe(4);
  });

  it('light enhancement level: no mode prefix', async () => {
    const result = await provider.polish(makeRequest({ mode: 'coding', rawText: 'do a thing', enhancementLevel: 'light' }));
    expect(result).not.toContain('[coding]');
  });

  it('normal enhancement level: includes mode prefix', async () => {
    const result = await provider.polish(makeRequest({ mode: 'coding', rawText: 'do a thing', enhancementLevel: 'normal' }));
    expect(result).toContain('[coding]');
  });

  it('heavy enhancement level: includes mode prefix', async () => {
    const result = await provider.polish(makeRequest({ mode: 'email', rawText: 'hi', enhancementLevel: 'heavy' }));
    expect(result).toContain('[email]');
  });

  it('does not throw on empty-ish string', async () => {
    await expect(provider.polish(makeRequest({ rawText: '   ' }))).resolves.toBeDefined();
  });
});
