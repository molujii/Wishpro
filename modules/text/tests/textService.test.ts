import { TextModuleService } from '../src/textService';
import { MockTextProvider } from '../src/providers/mockTextProvider';
import { TextProvider, TextPolishRequest, FinalTranscript } from '../src/types';
import { isTextError } from '../src/types';
import { SpeechRawTranscript } from '@modules/speech';

const mockTranscript: SpeechRawTranscript = {
  text: 'hello',
  provider: 'mock',
  createdAt: new Date().toISOString(),
};

function makeRequest(overrides: Partial<TextPolishRequest> = {}): TextPolishRequest {
  return {
    rawText: 'hello how are you',
    rawTranscript: mockTranscript,
    mode: 'conversation',
    ...overrides,
  };
}

class ThrowingProvider implements TextProvider {
  readonly name = 'mock' as const;
  async polish(_req: TextPolishRequest): Promise<string> {
    throw new Error('provider exploded');
  }
}

describe('TextModuleService', () => {
  const service = new TextModuleService(new MockTextProvider());

  it('happy path: returns FinalTranscript, isTextError is false', async () => {
    const result = await service.polish(makeRequest());
    expect(isTextError(result)).toBe(false);
    const transcript = result as FinalTranscript;
    expect(transcript.polishedText).toBeDefined();
  });

  it('rawText is preserved in result', async () => {
    const rawText = 'hello how are you';
    const result = await service.polish(makeRequest({ rawText })) as FinalTranscript;
    expect(result.rawText).toBe(rawText);
  });

  it('polishedText differs from rawText (mock transformed it)', async () => {
    const result = await service.polish(makeRequest({ rawText: 'um hello uh' })) as FinalTranscript;
    expect(result.polishedText).not.toBe('um hello uh');
  });

  it('mode is preserved in result', async () => {
    const result = await service.polish(makeRequest({ mode: 'coding' })) as FinalTranscript;
    expect(result.mode).toBe('coding');
  });

  it('createdAt is valid ISO-8601', async () => {
    const before = new Date().toISOString();
    const result = await service.polish(makeRequest()) as FinalTranscript;
    const after = new Date().toISOString();
    expect(result.createdAt >= before).toBe(true);
    expect(result.createdAt <= after).toBe(true);
  });

  it('empty string → INVALID_INPUT, retryable false', async () => {
    const result = await service.polish(makeRequest({ rawText: '' }));
    expect(isTextError(result)).toBe(true);
    if (isTextError(result)) {
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.retryable).toBe(false);
    }
  });

  it('whitespace-only string → INVALID_INPUT', async () => {
    const result = await service.polish(makeRequest({ rawText: '   ' }));
    expect(isTextError(result)).toBe(true);
    if (isTextError(result)) {
      expect(result.code).toBe('INVALID_INPUT');
    }
  });

  it('provider throws → fallback FinalTranscript with polishedText === rawText', async () => {
    const svc = new TextModuleService(new ThrowingProvider());
    const rawText = 'some input text';
    const result = await svc.polish(makeRequest({ rawText }));
    expect(isTextError(result)).toBe(false);
    const transcript = result as FinalTranscript;
    expect(transcript.polishedText).toBe(rawText);
    expect(transcript.rawText).toBe(rawText);
  });

  it('all four modes return FinalTranscript (not error)', async () => {
    const modes = ['conversation', 'coding', 'email', 'custom'] as const;
    for (const mode of modes) {
      const result = await service.polish(makeRequest({ mode }));
      expect(isTextError(result)).toBe(false);
    }
  });

  it('isTextError: true for errors, false for transcripts', async () => {
    const error = await service.polish(makeRequest({ rawText: '' }));
    const transcript = await service.polish(makeRequest());
    expect(isTextError(error)).toBe(true);
    expect(isTextError(transcript)).toBe(false);
  });

  it('enhancementLevel is propagated to provider', async () => {
    const spy = jest.spyOn(MockTextProvider.prototype, 'polish');
    await service.polish(makeRequest({ enhancementLevel: 'heavy' }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ enhancementLevel: 'heavy' }));
    spy.mockRestore();
  });
});
