import { TextEngine, PolishOptions } from './index';

export class OllamaEngine implements TextEngine {
  async polish(_text: string, _opts: PolishOptions): Promise<string> {
    // TODO: call local Ollama HTTP API
    throw new Error('OllamaEngine not yet implemented');
  }
}
