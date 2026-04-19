import fs from 'fs';
import os from 'os';
import path from 'path';
import { WhisperAdapter } from '../src/providers/whisperAdapter';

describe('WhisperAdapter (scaffold)', () => {
  let tmpWavPath: string;

  beforeAll(() => {
    tmpWavPath = path.join(os.tmpdir(), `whispro-whisper-${Date.now()}.wav`);
    fs.writeFileSync(tmpWavPath, Buffer.alloc(0));
  });

  afterAll(() => {
    fs.unlinkSync(tmpWavPath);
  });

  it('has name property === "whisper-cpp"', () => {
    expect(new WhisperAdapter('/models/ggml-base.bin').name).toBe('whisper-cpp');
  });

  it('rejects when whisper executable is not found', async () => {
    const adapter = new WhisperAdapter('/models/ggml-base.bin', '__nonexistent_whisper_exec__');
    await expect(adapter.transcribe({ audioFilePath: tmpWavPath })).rejects.toThrow(
      /Failed to spawn whisper process/i,
    );
  });

  it('accepts a custom execPath without throwing at construction', () => {
    expect(
      () => new WhisperAdapter('/models/ggml-base.bin', '/usr/local/bin/whisper-cpp'),
    ).not.toThrow();
  });
});
