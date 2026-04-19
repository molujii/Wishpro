"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTextError = isTextError;
function isTextError(result) {
    return 'code' in result && 'retryable' in result;
}
