# Module 9 – Deployment Implementation Plan

## Context

WhispPro Module 8 (Packaging) is complete: Electron Forge produces a signed/notarized Mac DMG, all icons are in place, and a release.yml GitHub Actions workflow exists. However, the release workflow only uploads build artifacts to Actions (not GitHub Releases), and there is zero auto-updater infrastructure. Module 9 closes that gap — enabling users to receive updates silently and automatically, and ensuring every tagged release is published to GitHub Releases as a downloadable, versioned asset.

**Spec**: `.claude/specs/module-9-spec.md`  
**Skill**: `.claude/skills/Deployment/SKILL.md`

---

## Scope

| In scope | Out of scope |
|---|---|
| GitHub Releases integration (CI upload) | Mac App Store / Notarization new work |
| `electron-updater` auto-updater service | Full marketing/landing page |
| IPC update-check handlers | Windows installer / Linux packages |
| Renderer update UI (progress + restart) | Enterprise MDM deployment |
| Release channel detection (stable/beta) | Homebrew cask automation |
| Deployment checklist documentation | |

---

## Files to Create or Modify

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add `electron-updater` runtime dep + `publish` config |
| `forge.config.ts` | Modify | Add GitHub publisher config for auto-update feed |
| `.github/workflows/release.yml` | Modify | Upload DMG to GitHub Releases, set `GH_TOKEN` |
| `app/main/services/autoUpdater.ts` | Create | Auto-updater service (initialize, check, events) |
| `app/main/ipc/updateHandlers.ts` | Create | IPC handlers for renderer ↔ updater communication |
| `app/main/ipc/registerIpcHandlers.ts` | Modify | Register update IPC handlers |
| `app/main/index.ts` | Modify | Initialize auto-updater on app ready |
| `app/renderer/src/components/UpdateBanner.tsx` | Create | In-app update notification UI |
| `app/renderer/src/hooks/useUpdater.ts` | Create | Renderer hook for update state |
| `docs/deployment.md` | Create | Deployment guide + release checklist |

---

## Step-by-Step Implementation

### Step 1 — Add `electron-updater` dependency

**File**: `package.json`

Add to `dependencies` (runtime, not devDependencies — it's bundled with the app):
```json
"electron-updater": "^6.3.0"
```

Add `build.publish` config block (read by electron-updater to locate the GitHub feed):
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "molujii",
    "repo": "WishPro"
  }
}
```

### Step 2 — Add GitHub publisher to `forge.config.ts`

**File**: `forge.config.ts`

Add the `@electron-forge/publisher-github` package and config so `electron-forge publish` can push assets:
```ts
publishers: [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: { owner: 'molujii', name: 'WishPro' },
      prerelease: false,
      draft: false,
    },
  },
],
```

Add devDependency: `@electron-forge/publisher-github@^7.0.0`

### Step 3 — Update `release.yml` to publish to GitHub Releases

**File**: `.github/workflows/release.yml`

Replace the `upload-artifact` step with a `electron-forge publish` step:
```yaml
- name: Publish to GitHub Releases
  run: npm run publish
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    APPLE_APP_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
    APPLE_IDENTITY: ${{ secrets.APPLE_IDENTITY }}
```

Add `publish` script to `package.json`:
```json
"publish": "electron-forge publish"
```

### Step 4 — Create auto-updater service

**File**: `app/main/services/autoUpdater.ts`

```ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-status', { status: 'downloading', percent: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-status', { status: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
    mainWindow.webContents.send('update-status', { status: 'error', message: err.message });
  });
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify();
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
```

### Step 5 — Create IPC update handlers

**File**: `app/main/ipc/updateHandlers.ts`

```ts
import { ipcMain } from 'electron';
import { checkForUpdates, installUpdate } from '../services/autoUpdater';

export function registerUpdateHandlers(): void {
  ipcMain.handle('check-for-update', () => {
    checkForUpdates();
  });

  ipcMain.handle('install-update', () => {
    installUpdate();
  });
}
```

### Step 6 — Wire up in main process

**File**: `app/main/ipc/registerIpcHandlers.ts`

Import and call `registerUpdateHandlers()`.

**File**: `app/main/index.ts`

After `mainWindow` is created, call `initAutoUpdater(mainWindow)`.  
On `app.ready`, call `checkForUpdates()` after a 3-second delay (avoid blocking startup).

```ts
app.whenReady().then(() => {
  const mainWindow = createMainWindow();
  initAutoUpdater(mainWindow);
  registerIpcHandlers();
  setTimeout(() => checkForUpdates(), 3000);
});
```

### Step 7 — Renderer update hook

**File**: `app/renderer/src/hooks/useUpdater.ts`

```ts
import { useState, useEffect } from 'react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date' | 'error';

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    window.electronAPI?.onUpdateStatus?.((payload) => {
      setStatus(payload.status);
      if (payload.version) setVersion(payload.version);
      if (payload.percent !== undefined) setPercent(payload.percent);
    });
  }, []);

  const checkForUpdate = () => window.electronAPI?.checkForUpdate?.();
  const installUpdate = () => window.electronAPI?.installUpdate?.();

  return { status, version, percent, checkForUpdate, installUpdate };
}
```

### Step 8 — Update banner component

**File**: `app/renderer/src/components/UpdateBanner.tsx`

Minimal banner that appears when `status === 'available'`, `'downloading'`, or `'ready'`.  
- Available: "Update v{version} available — downloading…"
- Downloading: progress bar with `{percent.toFixed(0)}%`
- Ready: "Update ready — Restart to install" + Restart button (calls `installUpdate()`)
- Error: subtle "Update check failed" (non-blocking)

### Step 9 — Expose IPC in preload

**File**: `app/main/preload.ts` (existing)

Add to `contextBridge.exposeInMainWorld`:
```ts
checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
installUpdate: () => ipcRenderer.invoke('install-update'),
onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_e, payload) => cb(payload)),
```

### Step 10 — Documentation

**File**: `docs/deployment.md`

Include:
- GitHub Actions secrets required (`APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD`, `APPLE_IDENTITY`)
- Tag-based release workflow (push `v*.*.*` tag → auto-publishes)
- Manual release steps (if needed)
- Release checklist (build, sign, notarize, publish, verify update feed)
- Update channel notes (stable vs beta pre-release flag)

---

## Dependencies to Install

```bash
npm install electron-updater electron-log
npm install --save-dev @electron-forge/publisher-github
```

---

## IPC Channel Reference

| Channel | Direction | Payload |
|---|---|---|
| `check-for-update` | renderer → main | none |
| `install-update` | renderer → main | none |
| `update-status` | main → renderer | `{ status, version?, percent?, message? }` |

---

## GitHub Actions Secrets Required

| Secret | Description |
|---|---|
| `GITHUB_TOKEN` | Auto-provided by Actions — no setup needed |
| `APPLE_ID` | Apple developer account email |
| `APPLE_TEAM_ID` | Apple team identifier |
| `APPLE_APP_PASSWORD` | App-specific password for notarization |
| `APPLE_IDENTITY` | Code signing identity string |

---

## Verification

1. **Unit test**: Mock `autoUpdater` events; verify IPC messages sent to renderer for each state.
2. **Local smoke test**: Set `autoUpdater.forceDevUpdateConfig = true`, point feed at a local YAML file, confirm state transitions.
3. **Release workflow**: Push a `v0.1.0` tag on the feature branch; confirm GitHub Actions publishes a DMG asset to the release.
4. **Auto-update E2E**: Install v0.1.0, publish v0.1.1 to GitHub Releases, launch v0.1.0 app, confirm update banner appears and restart installs v0.1.1.
5. **Failure handling**: Disconnect network, verify graceful "error" status and no crash.

---

## Definition of Done

- [ ] `electron-updater` installed and initialized on app ready
- [ ] Auto-update checks GitHub Releases feed on startup (3s delay)
- [ ] Renderer shows update banner for available / downloading / ready states
- [ ] IPC handlers registered for `check-for-update` and `install-update`
- [ ] `release.yml` publishes DMG to GitHub Releases on version tag push
- [ ] `docs/deployment.md` documents required secrets and release steps
- [ ] Tests cover updater service and IPC handlers
