import { SpeechProvider, SpeechProviderName, SpeechRequest, SpeechRawTranscript } from '../types';
export declare class MockSpeechProvider implements SpeechProvider {
    private readonly delayMs;
    readonly name: SpeechProviderName;
    constructor(delayMs?: number);
    transcribe(request: SpeechRequest): Promise<SpeechRawTranscript>;
}
