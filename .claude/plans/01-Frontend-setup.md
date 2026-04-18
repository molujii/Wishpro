# Module 1 — Frontend/UI — Implementation Plan

## Context

WhispPro currently has a minimal React stub (`App.tsx` with a single button and status div) and no renderer bundler — `tsc` compiles everything to CommonJS which cannot bundle a React app for the browser context. This plan wires up Vite as the renderer bundler, builds all required UI components per the spec in `.claude/specs/module-1-spec.md`, applies the "Cold Glass Terminal" design from the frontend-design SKILL, and adds full unit tests. The result satisfies the Module 1 Definition of Done: React app boots in Electron, overlay renders and responds to interactions, IPC fires on mic/mode events, and `npm run dev` shows a working overlay with no errors.

---

## Design Direction — "Cold Glass Terminal"

Frosted-glass floating overlay, dark theme, amber accent that turns red while listening. No generic fonts or purple gradients.

| Role | Font | Why |
|---|---|---|
| Labels / wordmark | **Syne** 500/700 | Geometric, purpose-built feel |
| Status readouts | **DM Mono** 300/400 | Hardware-readout aesthetic |

**CSS token palette (defined in `global.css`):**
```
--color-surface:        rgba(14,14,18,0.82)     dark glass bg
--color-surface-raised: rgba(22,22,28,0.90)     button/dropdown bg
--color-border:         rgba(255,255,255,0.08)  subtle dividers
--color-text-primary:   #F0EEE8                 warm near-white
--color-text-muted:     rgba(240,238,232,0.45)
--color-accent:         #E8C547                 amber — idle mic glow
--color-listening:      #E84747                 red — active state
--font-display:         'Syne', sans-serif
--font-mono:            'DM Mono', monospace
```

Mic button pulse animation (`@keyframes pulse-ring` on `::before`) only active when `data-listening="true"`. Status text crossfades on change via opacity/transform transition.

---

## Phase 1 — Tooling Setup

### 1.1 Install missing packages
```bash
npm install --save-dev vite @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom concurrently wait-on
```

### 1.2 Create `app/renderer/vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  plugins: [react()],
  base: './',
  build: { outDir: path.resolve(__dirname, 'dist'), emptyOutDir: true },
  server: { port: 3000, strictPort: true },
});
```

### 1.3 Move & update HTML entry
- **Delete** `app/renderer/public/index.html`
- **Create** `app/renderer/index.html` — add Google Fonts preconnect + Syne + DM Mono links; replace `<script>` with `<script type="module" src="/src/index.tsx">`

### 1.4 Update `package.json` scripts
```json
"dev":          "concurrently \"tsc -p tsconfig.main.json --watch\" \"vite --config app/renderer/vite.config.ts\" \"wait-on http://localhost:3000 && electron .\"",
"dev:renderer": "vite --config app/renderer/vite.config.ts",
"build":        "tsc -p tsconfig.main.json && vite build --config app/renderer/vite.config.ts && electron-forge package",
"test":         "jest",
"lint":         "eslint 'app/**/*.{ts,tsx}' 'modules/**/*.ts'"
```

### 1.5 Split TypeScript configs
**Create `tsconfig.main.json`** (main process only, CommonJS):
```json
{ "extends": "./tsconfig.json", "compilerOptions": { "outDir": "./dist/main", "rootDir": "./app/main" }, "include": ["app/main/**/*"] }
```

**Create `app/renderer/tsconfig.json`** (renderer, Vite-managed, no emit):
```json
{ "extends": "../../tsconfig.json", "compilerOptions": { "module": "ESNext", "moduleResolution": "bundler", "noEmit": true }, "include": ["src/**/*"] }
```

**Modify root `tsconfig.json`** — narrow `include` to `["modules/**/*"]` only (main and renderer have their own configs now).

### 1.6 Update `jest.config.js` — split into two projects
```js
module.exports = {
  projects: [
    { displayName: 'main',     preset: 'ts-jest', testEnvironment: 'node',  roots: ['<rootDir>/app/main', '<rootDir>/modules'], testMatch: ['**/*.test.ts'] },
    { displayName: 'renderer', preset: 'ts-jest', testEnvironment: 'jsdom', roots: ['<rootDir>/app/renderer/src'], testMatch: ['**/*.test.tsx','**/*.test.ts'],
      moduleNameMapper: { '\\.css$': '<rootDir>/app/renderer/src/__mocks__/fileMock.ts' },
      setupFilesAfterFramework: ['<rootDir>/app/renderer/src/setupTests.ts'] },
  ],
  moduleNameMapper: { /* existing @modules/* paths */ },
};
```

---

## Phase 2 — Preload & Types

### 2.1 Modify `app/main/preload.ts`
Add three new IPC senders:
```ts
export type AppMode = 'conversation' | 'coding' | 'custom';
// add to contextBridge:
micStart:    () => ipcRenderer.send('ui:mic-start'),
micStop:     () => ipcRenderer.send('ui:mic-stop'),
modeChange:  (mode: AppMode) => ipcRenderer.send('ui:mode-change', { mode }),
```

### 2.2 Create `app/renderer/src/types/electron.d.ts`
Ambient declaration that makes `window.electronAPI` fully typed throughout the renderer — imports `AppMode` from preload so the type is defined in one place.

---

## Phase 3 — Shared State Context

### 3.1 Create `app/renderer/src/context/AppContext.tsx`
```ts
type Status = 'idle' | 'listening' | 'transcribing';
type Mode   = 'conversation' | 'coding' | 'custom';
interface AppState { listening: boolean; status: Status; mode: Mode; setListening, setStatus, setMode }
```
Implemented with `React.createContext` + three `useState` calls in a provider component. Exported as `AppContext` + `AppProvider`.

---

## Phase 4 — Components

### File structure
```
app/renderer/src/
├── context/AppContext.tsx
├── types/electron.d.ts
├── setupTests.ts
├── __mocks__/fileMock.ts
├── App.tsx                              (rewrite)
├── styles/global.css                    (rewrite with full token system)
└── components/
    ├── Overlay/{Overlay.tsx, .css, .test.tsx}
    ├── MicButton/{MicButton.tsx, .css, .test.tsx}
    ├── ModeSelector/{ModeSelector.tsx, .css, .test.tsx}
    ├── StatusText/{StatusText.tsx, .css, .test.tsx}
    ├── HistoryPane/HistoryPane.tsx       (placeholder)
    └── SettingsPane/SettingsPane.tsx     (placeholder)
```

### Component responsibilities

**`App.tsx`** — instantiates the three state values, wraps tree in `AppContext.Provider`, registers `onHotkeyPressed`, renders `<Overlay />`.

**`Overlay.tsx`** — IPC orchestration point. Reads context setters, wraps with IPC calls:
```ts
handleMicDown  → setListening(true) + setStatus('listening') + electronAPI.micStart()
handleMicUp    → setListening(false) + setStatus('idle')     + electronAPI.micStop()
handleModeChange → setMode(m) + electronAPI.modeChange(m)
```
Local state: `activeTab: 'mic' | 'history' | 'settings'`. Renders tab nav + tab content.

**`MicButton.tsx`** — reads `listening` from context; fires `onMicDown`/`onMicUp` props on mousedown/mouseup/mouseleave. Sets `data-listening` attribute for CSS animations. Inline SVG mic icon (no icon lib).

**`ModeSelector.tsx`** — custom dropdown (not `<select>`) with `open: boolean` local state. Props: `value: Mode`, `onChange: (Mode) => void`. Fully accessible: `role="listbox"`, `aria-expanded`.

**`StatusText.tsx`** — maps status → display string (`idle→"Ready"`, `listening→"Listening..."`, `transcribing→"Transcribing..."`). Crossfade animation via `useEffect` + `visible` local state toggled on status change.

**`HistoryPane.tsx` / `SettingsPane.tsx`** — pure placeholder `<div>` with message text. No props.

---

## Phase 5 — IPC in Main Process

**Modify `app/main/index.ts`** — add three `ipcMain.on` handlers:
```ts
ipcMain.on('ui:mic-start',   () => console.log('[IPC] ui:mic-start'));
ipcMain.on('ui:mic-stop',    () => console.log('[IPC] ui:mic-stop'));
ipcMain.on('ui:mode-change', (_e, { mode }) => console.log('[IPC] ui:mode-change:', mode));
// TODO Module 2: replace console.log with real orchestration
```

---

## Phase 6 — Unit Tests

**`setupTests.ts`** — imports `@testing-library/jest-dom`; defines `window.electronAPI` mock with `jest.fn()` for all five methods.

**`__mocks__/fileMock.ts`** — `export default {}` to stub CSS imports in Jest.

| Test file | Key assertions |
|---|---|
| `MicButton.test.tsx` | aria-label, aria-pressed, onMicDown/Up called, mouseleave triggers onMicUp, data-listening attribute |
| `ModeSelector.test.tsx` | trigger shows value, click opens options, selecting calls onChange, aria-expanded |
| `StatusText.test.tsx` | correct label for each status value |
| `Overlay.test.tsx` | tab switching renders correct pane, mic events call electronAPI.micStart/micStop, mode change calls electronAPI.modeChange |

---

## Files to Create or Modify

| Action | File |
|---|---|
| CREATE | `app/renderer/vite.config.ts` |
| CREATE | `app/renderer/index.html` |
| CREATE | `app/renderer/tsconfig.json` |
| CREATE | `tsconfig.main.json` |
| CREATE | `app/renderer/src/types/electron.d.ts` |
| CREATE | `app/renderer/src/context/AppContext.tsx` |
| CREATE | `app/renderer/src/setupTests.ts` |
| CREATE | `app/renderer/src/__mocks__/fileMock.ts` |
| CREATE | `app/renderer/src/components/Overlay/Overlay.tsx` + `.css` + `.test.tsx` |
| CREATE | `app/renderer/src/components/MicButton/MicButton.tsx` + `.css` + `.test.tsx` |
| CREATE | `app/renderer/src/components/ModeSelector/ModeSelector.tsx` + `.css` + `.test.tsx` |
| CREATE | `app/renderer/src/components/StatusText/StatusText.tsx` + `.css` + `.test.tsx` |
| CREATE | `app/renderer/src/components/HistoryPane/HistoryPane.tsx` |
| CREATE | `app/renderer/src/components/SettingsPane/SettingsPane.tsx` |
| MODIFY | `package.json` — scripts + devDependencies |
| MODIFY | `tsconfig.json` — narrow include to modules only |
| MODIFY | `jest.config.js` — split into main + renderer projects |
| MODIFY | `app/main/preload.ts` — add micStart/micStop/modeChange |
| MODIFY | `app/main/index.ts` — add ipcMain.on handlers |
| MODIFY | `app/renderer/src/App.tsx` — full rewrite |
| MODIFY | `app/renderer/src/styles/global.css` — full token system |
| DELETE | `app/renderer/public/index.html` — replaced by `app/renderer/index.html` |

---

## Verification

```bash
# 1. Install deps
npm install --save-dev vite @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom concurrently wait-on

# 2. Type check renderer
npx tsc --project app/renderer/tsconfig.json --noEmit   # expect: 0 errors

# 3. Type check main
npx tsc --project tsconfig.main.json --noEmit           # expect: 0 errors

# 4. Unit tests
npm test                                                  # expect: all renderer + main tests pass

# 5. Lint
npm run lint                                              # expect: 0 errors

# 6. Dev mode
npm run dev
# ✓ Vite ready on http://localhost:3000
# ✓ Electron opens overlay: wordmark, tabs, mic button, mode dropdown, "Ready" status
# ✓ Hold mic button → red pulse + "Listening..." + terminal prints [IPC] ui:mic-start
# ✓ Release → amber idle + "Ready" + terminal prints [IPC] ui:mic-stop
# ✓ Change mode → terminal prints [IPC] ui:mode-change: coding
# ✓ History/Settings tabs show placeholder text
```

---

## Implementation Order

1. Tooling (Phase 1) — gates everything else
2. Preload + type declaration (Phase 2) — required for TypeScript to accept `window.electronAPI`
3. AppContext (Phase 3) — required before any component that consumes it
4. Leaf components: MicButton, ModeSelector, StatusText, placeholders (Phase 4)
5. Overlay + App rewrite (Phase 4) — imports all leaves
6. Main IPC handlers (Phase 5) — can run in parallel with UI work
7. Tests (Phase 6) — written alongside each component
