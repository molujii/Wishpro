# Module 8 – Packaging – Spec

## 1. Purpose
Package WhispPro as a desktop application installer, starting with Mac-first distribution.

## 2. Scope
**In scope**: Electron packaging config, build artifacts, Mac app packaging, installer generation  
**Out of scope**: full deployment website, store listing copy, release marketing

## 3. Product direction
WhispPro plans to use Electron Forge or Electron Builder for packaging, with Mac-first support and future Windows/Linux support.[file:1]

The first priority is to produce a working packaged desktop app that can later be signed and notarized for Mac distribution.[file:1]

## 4. Core requirements

### Packaging setup
1. Configure Electron Forge or Electron Builder
2. Support `npm run package` and/or `npm run make`
3. Produce local build artifacts for testing
4. Ensure app metadata is set:
   - app name
   - bundle id
   - version
   - icons

### Mac-first target
5. Create `.app` and preferably `.dmg` output for macOS
6. Prepare for code signing and notarization later
7. Keep config extensible for Windows/Linux future support.[file:1]

### Packaging quality
8. Ensure frontend and backend bundles are included correctly
9. Ensure preload/main/renderer paths resolve in production
10. Ensure packaged app launches successfully in local test

## 5. Signing readiness
11. Packaging config should prepare for:
   - Apple Developer signing
   - notarization
   - hardened runtime
12. Secrets/certificates must remain external to the repo.[file:1]

## 6. Example scripts
```json
{
  "scripts": {
    "build": "webpack --mode production",
    "package": "electron-forge package",
    "make": "electron-forge make"
  }
}
```

## 7. Folder / config examples
forge.config.ts
package.json
assets/icons/

text

## 8. Testing
- Local package builds successfully
- Packaged app launches
- Output artifact exists in expected directory
- Production path issues are fixed

## 9. Definition of done
- Packaging config is added
- `npm run package` works
- `npm run make` works or is scaffolded
- Mac build artifact is generated
- app metadata/icons configured
- signing/notarization hooks scaffolded