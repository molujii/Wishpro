import { TextMode, EnhancementLevel } from './types';

export const MODE_PROMPTS: Record<TextMode, string> = {
  conversation: 'Clean up casual speech. Remove filler words (um, uh, like). Fix grammar. Keep the natural tone.',
  coding: 'Format as clean code comments or documentation. Use proper technical syntax and terminology.',
  email: 'Make professional. Fix grammar, improve clarity, use business tone. Keep it concise.',
  custom: 'Clean up and improve the text while preserving the original meaning.',
};

export const ENHANCEMENT_PREFIX: Record<EnhancementLevel, string> = {
  light: 'Make minimal corrections only. ',
  normal: '',
  heavy: 'Extensively rewrite for maximum clarity and professionalism. ',
};

export function buildPrompt(mode: TextMode, level: EnhancementLevel = 'normal'): string {
  return ENHANCEMENT_PREFIX[level] + MODE_PROMPTS[mode];
}
