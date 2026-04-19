import { TextProvider, TextPolishRequest, FinalTranscript, TextError } from './types';
export declare class TextModuleService {
    private readonly provider;
    constructor(provider: TextProvider);
    polish(request: TextPolishRequest): Promise<FinalTranscript | TextError>;
}
