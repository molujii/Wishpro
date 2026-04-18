# WhispPro – Local Voice Transcription Desktop App

## Project summary

WhispPro is a cross-platform desktop utility (Mac first) that lets users hold a hotkey, speak, and have their speech transcribed locally and optionally polished by an LLM, then pasted at the current cursor. It stores a searchable transcript history and supports multiple languages, modes (Conversation, Coding, Email, etc.), and pluggable ASR/LLM engines.

Privacy-first: all processing is local by default, with opt-in cloud options for users who want higher accuracy.

## High-level architecture

- Electron + React + TypeScript frontend (renderer) providing:
  - Floating mic control / overlay
  - Status indicator (“Idle”, “Listening”, “Transcribing”)
  - Mode selector (Conversation, Coding, Custom)
  - Access to transcript history and settings

- Node.js/TypeScript backend (Electron main process) providing:
  - Global hotkey registration and microphone capture
  - IPC between renderer and backend
  - Orchestration of Speech Model and Text Model modules
  - Settings and feature flags

- Speech Model subsystem:
  - Default: local Whisper-based ASR (whisper.cpp or Python wrapper)
  - Optional: cloud ASR (OpenAI Whisper API, NVIDIA Parakeet, etc.)

- Text Model subsystem:
  - Local LLM (via Ollama or GPT4All) for offline polishing
  - Optional cloud LLMs (OpenAI, Claude, Gemini) for higher quality

- Database subsystem:
  - Local SQLite for transcript history and user settings

- CI/CD and DevOps:
  - GitHub Actions for build, test, and packaging pipelines
  - Electron Forge / Electron Builder for installers
  - Code signing + notarization for Mac; auto-updates in later phase

## Modules

1. Frontend/UI  
2. Backend/Logic  
3. Speech Model  
4. Text Model  
5. Database  
6. Authentication (local + optional cloud sync)  
7. CI/CD  
8. Packaging  
9. Deployment

Each module has:
- A `docs/module-N-spec.md` (requirements and constraints)
- A `docs/module-N-instructions.md` (Claude Code workflow + prompts)

## Tech stack decisions

- Frontend: Electron + React + TypeScript
- Backend: Node.js + TypeScript (Electron main process + Node services)
- Speech: Whisper-based local ASR first, with extension points for other engines
- Text: Local/remote LLMs behind a single interface
- Storage: SQLite for transcripts + settings
- CI/CD: GitHub Actions workflows for lint/test/build/package
- Packaging: Electron Forge or Builder for Mac DMG and cross-platform installers

## Conventions

- Language: TypeScript for all JS/TS code.
- Directory structure (initial):

  - `app/` – Electron app (main + renderer)
    - `app/main/` – Electron main process, orchestration, native integrations
    - `app/renderer/` – React UI
  - `modules/` – Feature-oriented submodules
    - `modules/speech/`
    - `modules/text/`
    - `modules/db/`
    - `modules/auth/`
  - `docs/` – Specs and instructions
    - `docs/module-1-spec.md`
    - `docs/module-1-instructions.md`
    - ...
  - `scripts/` – Dev, build, packaging scripts

- Testing:
  - Jest for unit tests
  - Playwright/Cypress or Spectron for end-to-end Electron tests

## How Claude should help

When working in this repo, Claude should:

1. Read the relevant `docs/module-N-*.md` before coding.
2. Propose a task list and file plan before editing code.
3. Modify only the files agreed in the task list, step by step.
4. Keep frontend/UI changes incremental and consistent with existing design.
5. Maintain TypeScript types and tests as first-class citizens.
6. Prefer small, reviewable changes over huge rewrites.

## Module workflow pattern

For each module:

1. Read the module spec and instructions.
2. Ask the user clarifying questions if anything is ambiguous.
3. Propose:
   - File structure / changes
   - API shapes and types
   - UX impact (if any)
4. Implement code in small steps:
   - Create interfaces / types first
   - Implement logic
   - Wire up UI
   - Add tests
5. Run appropriate commands (defined in SKILL.md) to build/test.
6. Stop when the module's “Definition of Done” is satisfied and summarize changes.
