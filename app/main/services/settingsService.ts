import path from 'path';
import { app } from 'electron';
import { openDatabase, getAllSettings, saveSetting } from '../../../modules/db/src';
import { SpeechService, MockSpeechService } from './speechService';
import { TextService, MockTextService } from './textService';

export interface AppSettings {
  speechProvider: 'mock' | 'whisper-cpp';
  speechModelPath: string;
  speechExecPath: string;
  speechLanguage: string;
  textProvider: 'mock' | 'ollama';
  textModel: string;
  textOllamaUrl: string;
  textEnhancement: 'light' | 'normal' | 'heavy';
}

export const DEFAULT_SETTINGS: AppSettings = {
  speechProvider: 'mock',
  speechModelPath: '',
  speechExecPath: 'whisper-cpp',
  speechLanguage: 'en',
  textProvider: 'mock',
  textModel: 'llama3',
  textOllamaUrl: 'http://localhost:11434',
  textEnhancement: 'normal',
};

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'whispro.db');
  openDatabase(dbPath);
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await getAllSettings();
  return {
    speechProvider:  (raw['speech.provider']  as AppSettings['speechProvider'])  ?? DEFAULT_SETTINGS.speechProvider,
    speechModelPath: (raw['speech.model-path'] as string)                         ?? DEFAULT_SETTINGS.speechModelPath,
    speechExecPath:  (raw['speech.exec-path']  as string)                         ?? DEFAULT_SETTINGS.speechExecPath,
    speechLanguage:  (raw['speech.language']   as string)                         ?? DEFAULT_SETTINGS.speechLanguage,
    textProvider:    (raw['text.provider']     as AppSettings['textProvider'])    ?? DEFAULT_SETTINGS.textProvider,
    textModel:       (raw['text.model']        as string)                         ?? DEFAULT_SETTINGS.textModel,
    textOllamaUrl:   (raw['text.ollama-url']   as string)                         ?? DEFAULT_SETTINGS.textOllamaUrl,
    textEnhancement: (raw['text.enhancement']  as AppSettings['textEnhancement']) ?? DEFAULT_SETTINGS.textEnhancement,
  };
}

export async function persistSettings(settings: Partial<AppSettings>): Promise<void> {
  const keyMap: Record<keyof AppSettings, string> = {
    speechProvider:  'speech.provider',
    speechModelPath: 'speech.model-path',
    speechExecPath:  'speech.exec-path',
    speechLanguage:  'speech.language',
    textProvider:    'text.provider',
    textModel:       'text.model',
    textOllamaUrl:   'text.ollama-url',
    textEnhancement: 'text.enhancement',
  };
  for (const [k, v] of Object.entries(settings)) {
    await saveSetting(keyMap[k as keyof AppSettings], v);
  }
}

export function buildSpeechService(settings: AppSettings): SpeechService {
  if (settings.speechProvider === 'whisper-cpp') {
    if (!settings.speechModelPath) {
      throw new Error('Whisper model path is not configured. Set it in Settings.');
    }
    // Lazy import to avoid loading child_process module in renderer context
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WhisperSpeechService } = require('./whisperSpeechService') as typeof import('./whisperSpeechService');
    return new WhisperSpeechService(settings.speechModelPath, settings.speechExecPath, settings.speechLanguage);
  }
  return new MockSpeechService();
}

export function buildTextService(settings: AppSettings): TextService {
  if (settings.textProvider === 'ollama') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OllamaTextService } = require('./ollamaTextService') as typeof import('./ollamaTextService');
    return new OllamaTextService(settings.textOllamaUrl, settings.textModel, settings.textEnhancement);
  }
  return new MockTextService();
}
