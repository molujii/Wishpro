# WishPro – Project Spec Overview

## What it is
Local-first voice transcription desktop app (Electron + React + TypeScript).
Hold hotkey → speak → transcribed text pasted at cursor. Optional LLM polish.

## Modules & status
| # | Module         | Status      |
|---|----------------|-------------|
| 1 | Frontend/UI    | scaffolded  |
| 2 | Backend/Logic  | scaffolded  |
| 3 | Speech Model   | stub        |
| 4 | Text Model     | stub        |
| 5 | Database       | implemented |
| 6 | Auth           | stub        |
| 7 | CI/CD          | ci.yml done |
| 8 | Packaging      | not started |
| 9 | Deployment     | not started |

## Key decisions
- whisper.cpp for local ASR (subprocess)
- Ollama for local LLM polish
- better-sqlite3 for storage
- Electron Forge for packaging
- Global hotkey: Cmd+Shift+Space (configurable)
