"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperAdapter = void 0;
const child_process_1 = require("child_process");
class WhisperAdapter {
    constructor(modelPath, execPath = 'whisper-cpp') {
        this.modelPath = modelPath;
        this.execPath = execPath;
        this.name = 'whisper-cpp';
    }
    async transcribe(request) {
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
    runProcess(args, timeoutMs) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(this.execPath, args);
            let stdout = '';
            let stderr = '';
            let timer;
            if (timeoutMs && timeoutMs > 0) {
                timer = setTimeout(() => {
                    child.kill('SIGKILL');
                    reject(new Error(`Whisper timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }
            child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
            child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
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
    parseOutput(raw) {
        const jsonStart = raw.indexOf('{');
        if (jsonStart === -1) {
            // Plain text output fallback
            return raw.trim();
        }
        try {
            const parsed = JSON.parse(raw.slice(jsonStart));
            if (parsed.text)
                return parsed.text;
            if (parsed.segments) {
                return parsed.segments.map(s => s.text).join(' ');
            }
        }
        catch {
            // ignore parse error, return raw
        }
        return raw.trim();
    }
}
exports.WhisperAdapter = WhisperAdapter;
