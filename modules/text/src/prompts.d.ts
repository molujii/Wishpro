import { TextMode, EnhancementLevel } from './types';
export declare const MODE_PROMPTS: Record<TextMode, string>;
export declare const ENHANCEMENT_PREFIX: Record<EnhancementLevel, string>;
export declare function buildPrompt(mode: TextMode, level?: EnhancementLevel): string;
