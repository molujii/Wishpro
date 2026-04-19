import { TextProvider, TextProviderName, TextPolishRequest } from '../types';

export class OllamaProvider implements TextProvider {
  readonly name: TextProviderName = 'ollama';

  constructor(
    private readonly baseUrl: string = 'http://localhost:11434',
    private readonly model: string = 'llama3'
  ) {}

  async polish(_request: TextPolishRequest): Promise<string> {
    throw new Error(`OllamaProvider(${this.model} @ ${this.baseUrl}) is not yet implemented`);
  }
}
