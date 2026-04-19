# Module 9 – Deployment – Spec

## 1. Purpose
Distribute the packaged WhispPro app to users through reliable channels with auto-update support.

## 2. Scope
**In scope**: GitHub Releases setup, direct download distribution, auto-updater config, release checklist  
**Out of scope**: App store submission, full marketing website, enterprise deployment

## 3. Product direction
WhispPro prioritizes direct download distribution (GitHub Releases, simple landing page) with optional Homebrew cask for Mac users.

## 4. Core requirements

### Distribution channels
1. **GitHub Releases** (primary)
   - Upload signed Mac DMG
   - Auto-generated release notes
   - Download stats tracking
2. **Direct download** from GitHub or simple static site
3. **Homebrew cask** (Mac optional)
4. **Future**: Windows installer, Linux packages

### Auto-update
5. Configure Electron autoUpdater
6. Support release channel detection
7. Graceful fallback on update failure
8. Version comparison logic

### Release workflow
6. GitHub Actions release workflow
7. Tag-based automated releases
8. Asset upload automation
9. Changelog generation

## 5. Backend contract
```ts
// autoUpdater setup in main process
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://github.com/user/whisppro/releases'
});
autoUpdater.checkForUpdates();
```

## 6. Release checklist automation
✅ Build all platforms
✅ Code signing complete
✅ Notarization passed (Mac)
✅ VirusTotal scan passed
✅ Size optimized
✅ Release notes generated
✅ Assets uploaded

text

## 7. Update channels
stable - production releases
beta - pre-release testing
dev - daily/nightly builds

text

## 8. Security requirements
- Only serve signed binaries
- Verify checksums where possible
- Block unsigned update payloads
- Clear update failure messaging

## 9. Folder structure
.github/
└── workflows/
└── release.yml
electron/
├── autoUpdater.ts
└── release-notes.ts
docs/
└── deployment.md

text

## 10. Testing
- Local release workflow runs
- Packaged app checks for updates
- Update failure handled gracefully
- Release assets generated correctly

## 11. Definition of done
- GitHub release workflow publishes assets
- Auto-updater configured and testable
- First test release created
- Deployment checklist documented