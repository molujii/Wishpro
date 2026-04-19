"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSpeechError = isSpeechError;
function isSpeechError(result) {
    return 'code' in result && 'retryable' in result;
}
