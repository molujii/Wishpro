"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextModuleService = void 0;
class TextModuleService {
    constructor(provider) {
        this.provider = provider;
    }
    async polish(request) {
        if (!request.rawText || !request.rawText.trim()) {
            return {
                code: 'INVALID_INPUT',
                message: 'rawText must be a non-empty string',
                retryable: false,
            };
        }
        try {
            const polishedText = await this.provider.polish(request);
            return {
                rawText: request.rawText,
                polishedText,
                mode: request.mode,
                createdAt: new Date().toISOString(),
            };
        }
        catch {
            return {
                rawText: request.rawText,
                polishedText: request.rawText,
                mode: request.mode,
                createdAt: new Date().toISOString(),
            };
        }
    }
}
exports.TextModuleService = TextModuleService;
