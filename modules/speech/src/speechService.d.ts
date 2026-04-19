import { SpeechProvider, SpeechRequest, SpeechRawTranscript, SpeechError } from './types';
export declare class SpeechModuleService {
    private readonly provider;
    constructor(provider: SpeechProvider);
    transcribe(request: SpeechRequest): Promise<SpeechRawTranscript | SpeechError>;
    private transcribeWithTimeout;
    private callProvider;
}
