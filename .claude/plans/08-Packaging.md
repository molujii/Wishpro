# Module 8 – Packaging – Implementation Plan

## Context

WhispPro needs to be distributed as a native desktop app on macOS. Currently the project has Electron and Electron Forge dependencies installed but no packaging configuration exists. The build pipeline produces output in `dist/main/` (main process, via `tsc`) and `app/renderer/dist/` (renderer, via `vite`), but there is no `forge.config.ts`, no app icons, and no proper production path resolution in `createMainWindow.ts`. This module wires everything together so `npm run package` and `npm run make` produce a launchable `.app` and `.dmg` on macOS, with signing/notarization hooks scaffolded for later.

---

## Critical Files

| File | Status | Action |
|------|--------|--------|
| `forge.config.ts` | Missing | Create |
| `package.json` | Exists | Update scripts + metadata |
| `app/main/window/createMainWindow.ts` | Exists | Fix production renderer path |
| `assets/icons/icon.icns` | Missing | Create placeholder + instructions |
| `assets/icons/icon.png` | Missing | Create placeholder |
| `tsconfig.main.json` | Exists | Verify outDir aligns with forge config |
| `app/renderer/vite.config.ts` | Exists | Verify outDir aligns with forge config |

---

## Step-by-Step Implementation

### Step 1 – Fix production renderer path in `createMainWindow.ts`

**File:** `app/main/window/createMainWindow.ts`

The current `loadFile` path `../../../app/renderer/dist/index.html` is relative to `__dirname` at dev time, but will break in a packaged app because Electron Forge copies all resources into the `.app` bundle. The correct production path resolves relative to the packaged resources:

```ts
// Replace the else branch:
win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
```

In the Forge config, we will copy `app/renderer/dist/` into `dist/renderer/dist/` so this path resolves correctly in both dev-build and packaged contexts. (See Step 3 for the exact extraResource mapping.)

**Alternative approach:** use `__dirname` relative path that works after packaging by placing renderer output next to main output. The Forge config will be set so `app/renderer/dist` is included as `extraResource` under `resources/renderer/dist`, and the loadFile path becomes:

```ts
win.loadFile(
  app.isPackaged
    ? path.join(process.resourcesPath, 'renderer/dist/index.html')
    : path.join(__dirname, '../../../app/renderer/dist/index.html')
);
```

This cleanly separates dev vs packaged paths without guessing directory layout.

---

### Step 2 – Add app icons

**Directory:** `assets/icons/`

Create the directory and add:
- `icon.png` – 512×512 PNG (placeholder or real icon)
- `icon.icns` – macOS icon bundle (generated from `icon.png` via `iconutil` or `electron-icon-maker`)

For the plan scaffold, we will commit a minimal 512×512 grey PNG as placeholder and document how to replace it. The `.icns` will be generated from it using a helper script.

**Helper script** (`scripts/generate-icons.sh`):
```bash
#!/bin/bash
# Requires: iconutil (macOS built-in), sips
mkdir -p assets/icons/icon.iconset
for size in 16 32 64 128 256 512; do
  sips -z $size $size assets/icons/icon.png \
    --out assets/icons/icon.iconset/icon_${size}x${size}.png
  sips -z $((size*2)) $((size*2)) assets/icons/icon.png \
    --out assets/icons/icon.iconset/icon_${size}x${size}@2x.png
done
iconutil -c icns assets/icons/icon.iconset -o assets/icons/icon.icns
```

---

### Step 3 – Create `forge.config.ts`

**File:** `forge.config.ts` (project root)

```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'WhispPro',
    executableName: 'WhispPro',
    appBundleId: 'com.whispro.app',
    appVersion: '0.1.0',
    icon: './assets/icons/icon',        // Forge appends .icns/.ico automatically
    extraResource: ['app/renderer/dist'],
    // Signing placeholders – populated via env vars in CI or local .env
    osxSign: process.env.APPLE_IDENTITY
      ? {
          identity: process.env.APPLE_IDENTITY,
          hardenedRuntime: true,
          entitlements: 'assets/entitlements.mac.plist',
          entitlementsInherit: 'assets/entitlements.mac.plist',
        }
      : undefined,
    osxNotarize: process.env.APPLE_ID
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD ?? '',
          teamId: process.env.APPLE_TEAM_ID ?? '',
        }
      : undefined,
  },
  makers: [
    new MakerDMG({
      name: 'WhispPro',
      icon: './assets/icons/icon.icns',
      format: 'ULFO',           // modern compressed DMG format
    }),
  ],
};

export default config;
```

Key decisions:
- `extraResource` copies `app/renderer/dist/` into `Contents/Resources/renderer/dist/` inside the `.app` bundle
- `osxSign` and `osxNotarize` are conditionally enabled via env vars — secrets never in repo
- `MakerDMG` uses ULFO format for smaller output (modern macOS required, which is our target)

---

### Step 4 – Add macOS entitlements file

**File:** `assets/entitlements.mac.plist`

Required for hardened runtime (microphone access for WhispPro):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>          <true/>
    <key>com.apple.security.device.microphone</key>     <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
  </dict>
</plist>
```

---

### Step 5 – Update `package.json` scripts and metadata

Replace/add the following in `package.json`:

```json
{
  "name": "whispro",
  "productName": "WhispPro",
  "version": "0.1.0",
  "description": "Local voice transcription desktop app",
  "author": "WhispPro Team",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "...",               // unchanged
    "build": "tsc -p tsconfig.main.json && vite build --config app/renderer/vite.config.ts",
    "package": "npm run build && electron-forge package",
    "make":    "npm run build && electron-forge make",
    "test":    "jest",
    "lint":    "eslint 'app/**/*.{ts,tsx}' 'modules/**/*.ts'",
    "icons":   "bash scripts/generate-icons.sh"
  }
}
```

Changes:
- Add `productName` (used by Forge as the displayed app name)
- Separate `package` (creates `.app` only) from `make` (creates `.app` + `.dmg`)
- Fix current `make` script which incorrectly called `electron-forge package` (should be `electron-forge make`)
- Add `icons` helper script

Also add missing Forge dependency if not already present:
```
@electron-forge/shared-types  (peer dep for forge.config.ts types)
```

---

### Step 6 – Install missing Forge dependencies

Check and install:
```bash
npm install --save-dev @electron-forge/shared-types @electron-forge/maker-dmg
```

`@electron-forge/maker-dmg` is already in `devDependencies` per package.json; `@electron-forge/shared-types` may be missing (needed for TypeScript types in `forge.config.ts`).

---

### Step 7 – Verify `tsconfig.main.json` and Vite output

- `tsconfig.main.json` outputs to `dist/main/` ✓ (already correct)
- `vite.config.ts` outputs to `app/renderer/dist/` ✓ (already correct)
- `package.json` `main` points to `dist/main/index.js` ✓ (already correct)
- `createMainWindow.ts` preload path: `path.join(__dirname, '../preload/index.js')` resolves to `dist/main/preload/index.js` ✓

The only path that needs fixing is the production renderer load (Step 1).

---

## File Tree After Module 8

```
/
├── forge.config.ts                       ← NEW
├── package.json                          ← UPDATED
├── assets/
│   ├── icons/
│   │   ├── icon.png                      ← NEW (placeholder)
│   │   ├── icon.icns                     ← NEW (generated)
│   │   └── icon.iconset/                 ← NEW (intermediate, gitignored)
│   └── entitlements.mac.plist            ← NEW
├── scripts/
│   └── generate-icons.sh                 ← NEW
├── app/main/window/createMainWindow.ts   ← UPDATED (production path fix)
└── .gitignore                            ← UPDATED (add icon.iconset/, out/)
```

---

## Environment Variables for Signing (never committed)

| Variable | Purpose |
|----------|---------|
| `APPLE_IDENTITY` | Developer ID Application cert name |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

Set in `.env.local` (gitignored) or CI secrets.

---

## Verification / Testing

1. **Build step**: `npm run build` — confirms TypeScript and Vite compile without errors
2. **Package step**: `npm run package` — should produce `out/WhispPro-darwin-arm64/WhispPro.app`
3. **Launch test**: `open out/WhispPro-darwin-arm64/WhispPro.app` — app should launch, show UI, accept hotkey
4. **Make step**: `npm run make` — should produce `out/make/WhispPro.dmg`
5. **DMG mount test**: mount the DMG and drag app to Applications, then launch
6. **Path checks**: verify renderer loads (no blank window) and preload script initialises (check DevTools console in packaged app with `--enable-logging`)

---

## Definition of Done

- [ ] `forge.config.ts` created with Mac-first config, DMG maker, signing hooks
- [ ] `package.json` updated with `productName`, correct `package` and `make` scripts
- [ ] `createMainWindow.ts` updated with packaged-vs-dev renderer path
- [ ] `assets/icons/icon.png` and `icon.icns` present
- [ ] `assets/entitlements.mac.plist` present
- [ ] `scripts/generate-icons.sh` present
- [ ] `npm run package` succeeds and produces `.app` artifact
- [ ] `npm run make` succeeds and produces `.dmg` artifact
- [ ] Packaged app launches without blank window
- [ ] Signing/notarization env-var hooks documented and scaffolded
