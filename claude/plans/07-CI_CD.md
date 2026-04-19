# Module 7 – CI/CD Implementation Plan

## Context
WhispPro uses GitHub Actions for CI/CD. A basic `ci.yml` existed but was incomplete — it ran lint and test but was missing the build step, had no release workflow, no artifact uploads, and no Mac packaging preparation. This plan completes Module 7 to its Definition of Done.

---

## Files Modified / Created

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Updated — added `npm run build` step, renamed job |
| `.github/workflows/release.yml` | Created — release scaffold with Mac packaging + artifact upload |

---

## CI Workflow (`.github/workflows/ci.yml`)

Runs on every push to `main` and every pull request targeting `main`.

Steps: checkout → setup Node 20 (with npm cache) → `npm ci` → `npm run lint` → `npm test` → `npm run build`

Fails fast if any step fails.

---

## Release Workflow (`.github/workflows/release.yml`)

Triggered on version tags (`v*.*.*`) or manually via `workflow_dispatch`.

Steps: checkout → setup Node 20 → `npm ci` → lint → test → build → `npm run make` (Electron Forge DMG) → upload artifact

Mac signing/notarization credentials are injected via GitHub encrypted secrets (never committed).

---

## Secrets Required

| Secret Name | Purpose |
|---|---|
| `APPLE_ID` | Apple developer ID email for notarization |
| `APPLE_TEAM_ID` | Apple team identifier |
| `APPLE_APP_PASSWORD` | App-specific password for notarization |

Set in: GitHub repo → Settings → Secrets and Variables → Actions

---

## Verification

1. Push a branch, open a PR → CI runs lint + test + build
2. Merge to `main` → CI runs again
3. Push a version tag (`git tag v0.1.0 && git push --tags`) → Release workflow triggers
4. Check Actions tab for green runs
5. Confirm DMG artifact appears in workflow run summary

---

## Definition of Done

- [x] CI runs on push/PR — lint, test, build all pass
- [x] Release workflow scaffold exists for tagged versions
- [x] Mac packaging step (`npm run make`) in release job
- [x] Build artifact upload configured
- [x] Secrets usage documented in workflow comments
- [x] No credentials committed to repo
