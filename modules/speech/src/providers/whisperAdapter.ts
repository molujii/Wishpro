import { spawn } from 'child_process';
import { SpeechProvider, SpeechProviderName, SpeechRequest, SpeechRawTranscript } from '../types';

interface WhisperJsonSegment {
  text: string;
}

interface WhisperJsonOutput {
  text?: string;
  segments?: WhisperJsonSegment[];
  language?: string;
}

export class WhisperAdapter implements SpeechProvider {
  readonly name: SpeechProviderName = 'whisper-cpp';

  constructor(
    private readonly modelPath: string,
    private readonly execPath: string = 'whisper-cpp',
  ) {}

  async transcribe(request: SpeechRequest): Promise<SpeechRawTranscript> {
    const startMs = Date.now();

    const args = [
      request.audioFilePath,
      '--model', this.modelPath,
      '--output-json',
      '--output-file', '-',
      '--no-timestamps',
    ];

    if (request.language) {
      args.push('--language', request.language);
    }

    const text = await this.runProcess(args, request.timeoutMs);
    const durationMs = Date.now() - startMs;

    return {
      text: text.trim(),
      language: request.language ?? 'en',
      durationMs,
      provider: this.name,
      createdAt: new Date().toISOString(),
    };
  }

  private runProcess(args: string[], timeoutMs?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.execPath, args);
      let stdout = '';
      let stderr = '';

      let timer: ReturnType<typeof setTimeout> | undefined;
      if (timeoutMs && timeoutMs > 0) {
        timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`Whisper timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to spawn whisper process: ${err.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Whisper exited with code ${code}: ${stderr.slice(0, 200)}`));
          return;
        }
        resolve(this.parseOutput(stdout));
      });
    });
  }

  private parseOutput(raw: string): string {
    const jsonStart = raw.indexOf('{');
    if (jsonStart === -1) {
      // Plain text output fallback
      return raw.trim();
    }
    try {
      const parsed: WhisperJsonOutput = JSON.parse(raw.slice(jsonStart));
      if (parsed.text) return parsed.text;
      if (parsed.segments) {
        return parsed.segments.map(s => s.text).join(' ');
      }
    } catch {
      // ignore parse error, return raw
    }
    return raw.trim();
  }
}
