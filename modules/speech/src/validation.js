"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSpeechRequest = validateSpeechRequest;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SUPPORTED_EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.webm']);
function validateSpeechRequest(request) {
    const { audioFilePath, timeoutMs } = request;
    if (!audioFilePath || typeof audioFilePath !== 'string' || audioFilePath.trim() === '') {
        return {
            code: 'INVALID_INPUT',
            message: 'audioFilePath must be a non-empty string',
            retryable: false,
        };
    }
    const ext = path_1.default.extname(audioFilePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
        return {
            code: 'INVALID_INPUT',
            message: `Unsupported audio format "${ext}". Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`,
            retryable: false,
        };
    }
    if (!fs_1.default.existsSync(audioFilePath)) {
        return {
            code: 'INVALID_INPUT',
            message: `Audio file not found: ${audioFilePath}`,
            retryable: false,
        };
    }
    if (timeoutMs !== undefined && (typeof timeoutMs !== 'number' || timeoutMs <= 0)) {
        return {
            code: 'INVALID_INPUT',
            message: 'timeoutMs must be a positive number',
            retryable: false,
        };
    }
    return null;
}
