"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const prompts_1 = require("../prompts");
class OllamaProvider {
    constructor(baseUrl = 'http://localhost:11434', model = 'llama3') {
        this.baseUrl = baseUrl;
        this.model = model;
        this.name = 'ollama';
    }
    async polish(request) {
        const systemPrompt = (0, prompts_1.buildPrompt)(request.mode, request.enhancementLevel ?? 'normal');
        const body = JSON.stringify({
            model: this.model,
            prompt: `${systemPrompt}\n\nText to improve:\n${request.rawText}`,
            stream: false,
        });
        let response;
        try {
            response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
        }
        catch (err) {
            throw new Error(`Cannot reach Ollama at ${this.baseUrl}. Is it running? (ollama serve)\n${err instanceof Error ? err.message : err}`);
        }
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Ollama responded with ${response.status}: ${text.slice(0, 200)}`);
        }
        const json = (await response.json());
        if (!json.response) {
            throw new Error('Ollama returned an empty response');
        }
        return json.response.trim();
    }
}
exports.OllamaProvider = OllamaProvider;
