import { TextProvider, TextProviderName, TextPolishRequest } from '../types';
export declare class OllamaProvider implements TextProvider {
    private readonly baseUrl;
    private readonly model;
    readonly name: TextProviderName;
    constructor(baseUrl?: string, model?: string);
    polish(request: TextPolishRequest): Promise<string>;
}
