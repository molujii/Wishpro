export type SpeechProviderName = 'mock' | 'whisper-cpp' | 'whisper-python' | 'cloud-whisper';
export interface SpeechRequest {
    audioFilePath: string;
    language?: string;
    timeoutMs?: number;
}
export interface SpeechRawTranscript {
    text: string;
    language?: string;
    durationMs?: number;
    confidence?: number;
    provider: SpeechProviderName;
    createdAt: string;
}
export type SpeechErrorCode = 'INVALID_INPUT' | 'TIMEOUT' | 'PROVIDER_FAILED';
export interface SpeechError {
    code: SpeechErrorCode;
    message: string;
    retryable: boolean;
}
export interface SpeechProvider {
    readonly name: SpeechProviderName;
    transcribe(request: SpeechRequest): Promise<SpeechRawTranscript>;
}
export declare function isSpeechError(result: SpeechRawTranscript | SpeechError): result is SpeechError;
