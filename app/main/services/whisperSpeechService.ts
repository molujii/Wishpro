import fs from 'fs';
import os from 'os';
import path from 'path';
import { SpeechService } from './speechService';
import { RawTranscript } from '../types/transcript';
import { WhisperAdapter } from '../../../modules/speech/src/providers/whisperAdapter';
import { isSpeechError } from '../../../modules/speech/src/types';
import { SpeechModuleService } from '../../../modules/speech/src/speechService';

export class WhisperSpeechService implements SpeechService {
  private readonly adapter: WhisperAdapter;
  private readonly module: SpeechModuleService;
  private readonly language: string;
  private tempFile: string | null = null;

  constructor(modelPath: string, execPath: string, language: string) {
    this.adapter = new WhisperAdapter(modelPath, execPath);
    this.module  = new SpeechModuleService(this.adapter);
    this.language = language;
  }

  async startCapture(): Promise<void> {
    // Recording is handled by the OS audio capture layer (future Module 3 expansion).
    // For now we create a temp file path that stopCaptureAndTranscribe will use.
    this.tempFile = path.join(os.tmpdir(), `whispro-${Date.now()}.wav`);
  }

  async stopCaptureAndTranscribe(): Promise<RawTranscript> {
    if (!this.tempFile) {
      throw new Error('startCapture() must be called before stopCaptureAndTranscribe()');
    }

    const audioFilePath = this.tempFile;
    this.tempFile = null;

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}. Recording may have failed.`);
    }

    const result = await this.module.transcribe({
      audioFilePath,
      language: this.language,
      timeoutMs: 30_000,
    });

    // Clean up temp file
    fs.unlink(audioFilePath, () => undefined);

    if (isSpeechError(result)) {
      throw new Error(`Speech transcription failed (${result.code}): ${result.message}`);
    }

    return {
      text: result.text,
      language: result.language,
      durationMs: result.durationMs,
      createdAt: result.createdAt,
    };
  }
}
