# WhispPro Deployment Guide

## Distribution Channel

WhispPro distributes via **GitHub Releases** as the primary channel. Every tagged release
automatically publishes a signed, notarized Mac DMG that users download directly.

## GitHub Actions Secrets

Set these in **Settings → Secrets and Variables → Actions** of the GitHub repo before
triggering a release:

| Secret | Purpose |
|---|---|
| `APPLE_ID` | Apple developer account email used for notarization |
| `APPLE_TEAM_ID` | Apple team identifier (10-character string) |
| `APPLE_APP_PASSWORD` | App-specific password generated at appleid.apple.com |
| `APPLE_IDENTITY` | Full code-signing identity string, e.g. `Developer ID Application: Foo (TEAMID)` |

`GITHUB_TOKEN` is auto-provided by Actions — no setup required.

## Release Workflow

### Automated (tag-based)

Push a version tag to trigger the release pipeline:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The `release.yml` workflow will:
1. Run lint + tests
2. Build the app
3. Sign and notarize the Mac DMG (if Apple secrets are set)
4. Publish the DMG to GitHub Releases via `electron-forge publish`

### Manual

Trigger from **Actions → Release → Run workflow** in the GitHub UI.

## Local Release (dev/test)

```bash
# Build + publish to GitHub Releases from your local machine
GH_TOKEN=<pat> APPLE_IDENTITY=... APPLE_ID=... npm run publish
```

Requires a GitHub Personal Access Token with `repo` scope.

## Auto-Update Architecture

- `electron-updater` polls the GitHub Releases feed on startup (after a 3-second delay).
- Update check URL is derived from the `build.publish` config in `package.json`:
  `https://github.com/molujii/WishPro/releases`
- If an update is available, the DMG is downloaded in the background and the user sees
  an in-app banner with a **Restart** button.
- On restart, the new version is installed automatically.

### Update Channels

| Tag style | Channel |
|---|---|
| `v1.0.0` | **stable** — `prerelease: false` in forge publisher |
| `v1.0.0-beta.1` | **beta** — mark as pre-release in GitHub Releases UI |

## Release Checklist

- [ ] Version bumped in `package.json` and `forge.config.ts`
- [ ] `CHANGELOG.md` updated (if maintained)
- [ ] All tests pass locally (`npm test`)
- [ ] App builds cleanly (`npm run make`)
- [ ] Code signed and notarized (verify `APPLE_*` secrets are set)
- [ ] Version tag pushed: `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] GitHub Release created with correct DMG asset
- [ ] Auto-update feed accessible: `https://github.com/molujii/WishPro/releases/latest/download/latest-mac.yml`
- [ ] Installed previous version → launched → update banner appears
- [ ] Restart installs new version successfully
- [ ] Test graceful failure: disable network, verify no crash on update check

## Troubleshooting

**No update available after publish**: Ensure `latest-mac.yml` was uploaded alongside the
DMG. `electron-forge publish` generates and uploads this file automatically.

**Notarization fails**: Check `APPLE_APP_PASSWORD` is an app-specific password (not your
Apple ID password). Generate at [appleid.apple.com](https://appleid.apple.com).

**Signature invalid**: Ensure `APPLE_IDENTITY` exactly matches the certificate name shown
in Keychain (`Developer ID Application: Name (TEAMID)`).
