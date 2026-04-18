# Module 3 – Speech Model Spec

## Purpose
Plug-in ASR layer. Default: local whisper.cpp. Optional: cloud ASR.

## Requirements
- SpeechEngine interface: transcribe(audioBuffer) → TranscriptionResult
- WhisperEngine: spawn whisper.cpp subprocess, parse output
- CloudWhisperEngine: call OpenAI Whisper API
- Language auto-detect or forced locale
- Engine selection via settings

## Definition of Done
- [ ] WhisperEngine transcribes a WAV file locally
- [ ] Unit tests with mock subprocess
- [ ] Engine switcher respects settings
