import { SpeechProvider, SpeechProviderName, SpeechRequest, SpeechRawTranscript } from '../types';
export declare class WhisperAdapter implements SpeechProvider {
    private readonly modelPath;
    private readonly execPath;
    readonly name: SpeechProviderName;
    constructor(modelPath: string, execPath?: string);
    transcribe(request: SpeechRequest): Promise<SpeechRawTranscript>;
    private runProcess;
    private parseOutput;
}
