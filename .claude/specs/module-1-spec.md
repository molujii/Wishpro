# Module 1 – Frontend/UI – Spec

## 1. Purpose

Implement the initial Electron+React UI for WhispPro:
- Floating mic control
- Mode selector
- Simple status indicator
- Placeholder scaffolding for settings and history views

## 2. Scope

In scope:
- Basic Electron renderer + React app bootstrapping
- Layout and styling for the main overlay UI
- Wiring UI events (e.g., mic button, mode change) to IPC stubs

Out of scope:
- Actual audio capture
- Real ASR/LLM integration
- Real history data (use mocked data or simple stubs)

## 3. User-facing behavior

- User sees a small draggable overlay with:
  - Mic button
  - Mode dropdown (Conversation, Coding, Custom)
  - Status text (“Ready”, “Listening…”, “Transcribing…”)
- Clicking and holding the mic button simulates “listening” (for now, just toggles state).
- UI adapts to light/dark themes based on OS or a simple toggle.

## 4. Functional requirements

1. Render a React app inside the Electron renderer window.
2. Provide a floating overlay component with mic button, mode selector, and status text.
3. Expose handlers for:
   - `onMicDown`, `onMicUp`
   - `onModeChange(mode: 'conversation' | 'coding' | 'custom')`
4. Send IPC messages to the Electron main process when mic is pressed/released and mode changes.
5. Provide placeholder routes or tabs for “History” and “Settings”.

## 5. Non-functional requirements

- UI must be responsive on common laptop resolutions.
- Code must be in TypeScript with strict type checking.
- Follow a minimal, clean style consistent with macOS HIG (no copy of any existing design).

## 6. Interfaces and contracts

- IPC channels:
  - `ui:mic-start`
  - `ui:mic-stop`
  - `ui:mode-change` with payload `{ mode: 'conversation' | 'coding' | 'custom' }`

- React components:
  - `<Overlay />` – main floating control
  - `<MicButton />`
  - `<ModeSelector />`
  - `<StatusText />`

## 7. Data model

- Local React state for:
  - `listening: boolean`
  - `status: 'idle' | 'listening' | 'transcribing'`
  - `mode: 'conversation' | 'coding' | 'custom'`

## 8. Dependencies

- Depends on:
  - Electron renderer process bootstrap
  - Basic IPC wiring in main process (stubbed)
- Provides:
  - UI surface for later modules (Speech, Text, Auth, etc.)

## 9. Open questions / future work

- Detailed theming system
- Keyboard accessibility patterns
- Localization

## 10. Definition of done

- React app boots successfully within Electron.
- Overlay UI renders and responds to user interactions.
- IPC messages fire on mic and mode events (can be logged in main process).
- Basic unit tests exist for main components.
- `npm run dev` shows a working overlay with no runtime errors.