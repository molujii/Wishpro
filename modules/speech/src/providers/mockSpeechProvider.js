"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSpeechProvider = void 0;
class MockSpeechProvider {
    constructor(delayMs = 0) {
        this.delayMs = delayMs;
        this.name = 'mock';
    }
    async transcribe(request) {
        if (this.delayMs > 0) {
            await new Promise((resolve) => {
                const t = setTimeout(resolve, this.delayMs);
                t.unref?.();
            });
        }
        return {
            text: 'Mock transcript from speech module',
            language: request.language ?? 'en',
            durationMs: 1500,
            confidence: 0.95,
            provider: this.name,
            createdAt: new Date().toISOString(),
        };
    }
}
exports.MockSpeechProvider = MockSpeechProvider;
