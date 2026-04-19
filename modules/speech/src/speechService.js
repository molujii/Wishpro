"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechModuleService = void 0;
const validation_1 = require("./validation");
class SpeechModuleService {
    constructor(provider) {
        this.provider = provider;
    }
    async transcribe(request) {
        const validationError = (0, validation_1.validateSpeechRequest)(request);
        if (validationError)
            return validationError;
        if (request.timeoutMs !== undefined && request.timeoutMs > 0) {
            return this.transcribeWithTimeout(request, request.timeoutMs);
        }
        return this.callProvider(request);
    }
    async transcribeWithTimeout(request, timeoutMs) {
        let timer;
        const timeoutPromise = new Promise((resolve) => {
            timer = setTimeout(() => {
                resolve({
                    code: 'TIMEOUT',
                    message: `Transcription timed out after ${timeoutMs}ms`,
                    retryable: true,
                });
            }, timeoutMs);
        });
        const result = await Promise.race([this.callProvider(request), timeoutPromise]);
        clearTimeout(timer);
        return result;
    }
    async callProvider(request) {
        try {
            return await this.provider.transcribe(request);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown provider error';
            return {
                code: 'PROVIDER_FAILED',
                message,
                retryable: true,
            };
        }
    }
}
exports.SpeechModuleService = SpeechModuleService;
