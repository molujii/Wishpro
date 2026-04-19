import { TextProvider, TextProviderName, TextPolishRequest } from '../types';
import { buildPrompt } from '../prompts';

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export class OllamaProvider implements TextProvider {
  readonly name: TextProviderName = 'ollama';

  constructor(
    private readonly baseUrl: string = 'http://localhost:11434',
    private readonly model: string = 'llama3',
  ) {}

  async polish(request: TextPolishRequest): Promise<string> {
    const systemPrompt = buildPrompt(request.mode, request.enhancementLevel ?? 'normal');

    const body = JSON.stringify({
      model: this.model,
      prompt: `${systemPrompt}\n\nText to improve:\n${request.rawText}`,
      stream: false,
    });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      throw new Error(
        `Cannot reach Ollama at ${this.baseUrl}. Is it running? (ollama serve)\n${err instanceof Error ? err.message : err}`,
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama responded with ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as OllamaGenerateResponse;

    if (!json.response) {
      throw new Error('Ollama returned an empty response');
    }

    return json.response.trim();
  }
}
