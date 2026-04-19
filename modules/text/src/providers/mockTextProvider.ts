import { TextProvider, TextProviderName, TextPolishRequest } from '../types';

export class MockTextProvider implements TextProvider {
  readonly name: TextProviderName = 'mock';

  async polish(request: TextPolishRequest): Promise<string> {
    const { rawText, mode, enhancementLevel = 'normal' } = request;
    const addPrefix = enhancementLevel !== 'light';
    const prefix = addPrefix ? `[${mode}] ` : '';

    switch (mode) {
      case 'conversation': {
        const cleaned = rawText
          .replace(/\b(um|uh|like|you know)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        const capitalized = cleaned.replace(/^./, c => c.toUpperCase());
        const withPeriod = capitalized.replace(/([^.!?])$/, '$1.');
        return prefix + withPeriod;
      }
      case 'coding':
        return prefix + '// ' + rawText.trim();
      case 'email': {
        const capitalized = rawText.trim().replace(/^./, c => c.toUpperCase());
        return prefix + capitalized + '\n\nBest regards';
      }
      case 'custom':
      default:
        return prefix + rawText.trim();
    }
  }
}
