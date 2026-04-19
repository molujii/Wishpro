import { TextService } from './textService';
import { RawTranscript, FinalTranscript } from '../types/transcript';
import { AppMode } from '../types/mode';
import { OllamaProvider } from '../../../modules/text/src/providers/ollamaProvider';
import { TextModuleService } from '../../../modules/text/src/textService';
import { EnhancementLevel } from '../../../modules/text/src/types';

type ModeMap = Record<AppMode, 'conversation' | 'coding' | 'email' | 'custom'>;
const MODE_MAP: ModeMap = {
  conversation: 'conversation',
  coding: 'coding',
  custom: 'custom',
};

export class OllamaTextService implements TextService {
  private readonly service: TextModuleService;
  private readonly enhancement: EnhancementLevel;

  constructor(ollamaUrl: string, model: string, enhancement: EnhancementLevel) {
    this.service    = new TextModuleService(new OllamaProvider(ollamaUrl, model));
    this.enhancement = enhancement;
  }

  async polishTranscript(input: RawTranscript, mode: AppMode): Promise<FinalTranscript> {
    const result = await this.service.polish({
      rawText: input.text,
      rawTranscript: {
        text: input.text,
        language: input.language,
        durationMs: input.durationMs,
        provider: 'mock',
        createdAt: input.createdAt,
      },
      mode: MODE_MAP[mode],
      enhancementLevel: this.enhancement,
    });

    // TextModuleService already falls back to rawText on error, so result is always FinalTranscript
    const final = result as import('../../../modules/text/src/types').FinalTranscript;
    return {
      rawText: final.rawText,
      polishedText: final.polishedText,
      mode,
      language: input.language,
      createdAt: final.createdAt,
    };
  }
}
