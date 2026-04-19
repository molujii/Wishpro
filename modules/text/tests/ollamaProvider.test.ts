import { OllamaProvider } from '../src/providers/ollamaProvider';
import { TextPolishRequest } from '../src/types';
import { SpeechRawTranscript } from '@modules/speech';

const mockTranscript: SpeechRawTranscript = {
  text: 'hello',
  provider: 'mock',
  createdAt: new Date().toISOString(),
};

const request: TextPolishRequest = {
  rawText: 'test input',
  rawTranscript: mockTranscript,
  mode: 'conversation',
};

describe('OllamaProvider', () => {
  it('has name "ollama"', () => {
    const provider = new OllamaProvider();
    expect(provider.name).toBe('ollama');
  });

  it('polish() rejects with /not yet implemented/i', async () => {
    const provider = new OllamaProvider();
    await expect(provider.polish(request)).rejects.toThrow(/not yet implemented/i);
  });

  it('construction with custom baseUrl and model does not throw', () => {
    expect(() => new OllamaProvider('http://custom:8080', 'mistral')).not.toThrow();
  });
});
