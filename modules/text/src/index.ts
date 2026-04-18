export interface PolishOptions {
  mode: 'conversation' | 'coding' | 'email' | 'custom';
  customPrompt?: string;
}

export interface TextEngine {
  polish(rawText: string, options: PolishOptions): Promise<string>;
}

export { OllamaEngine } from './ollamaEngine';
