"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENHANCEMENT_PREFIX = exports.MODE_PROMPTS = void 0;
exports.buildPrompt = buildPrompt;
exports.MODE_PROMPTS = {
    conversation: 'Clean up casual speech. Remove filler words (um, uh, like). Fix grammar. Keep the natural tone.',
    coding: 'Format as clean code comments or documentation. Use proper technical syntax and terminology.',
    email: 'Make professional. Fix grammar, improve clarity, use business tone. Keep it concise.',
    custom: 'Clean up and improve the text while preserving the original meaning.',
};
exports.ENHANCEMENT_PREFIX = {
    light: 'Make minimal corrections only. ',
    normal: '',
    heavy: 'Extensively rewrite for maximum clarity and professionalism. ',
};
function buildPrompt(mode, level = 'normal') {
    return exports.ENHANCEMENT_PREFIX[level] + exports.MODE_PROMPTS[mode];
}
