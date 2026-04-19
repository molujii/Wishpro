# Module 7 – CI/CD – Spec

## 1. Purpose
Automate build, test, and release checks for WhispPro using CI/CD pipelines.

## 2. Scope
**In scope**: GitHub Actions workflows, install/build/test automation, lint checks, packaging trigger setup  
**Out of scope**: full deployment hosting, release marketing, app store submission steps

## 3. Product direction
WhispPro is planned to use GitHub Actions for automated build, test, and packaging workflows.[file:1]

The CI/CD pipeline should help ensure:
- each push is validated
- pull requests are tested
- builds stay reproducible
- packaging can be triggered in a controlled way

## 4. Core requirements

### CI pipeline
1. Run on:
   - `push`
   - `pull_request`
2. Install dependencies with clean reproducible commands
3. Run:
   - lint
   - unit tests
   - build
4. Fail fast if any step breaks
5. Cache dependencies where practical

### CD / release preparation
6. Support release workflow for tagged versions
7. Allow packaging jobs to run on release or manually
8. Store build artifacts from successful runs
9. Prepare Mac packaging support in CI because packaging/signing is part of the roadmap.[file:1]

### Quality checks
10. Validate TypeScript build
11. Run backend/frontend tests
12. Keep output clear for debugging beginners

## 5. Example workflows
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

### Example steps
```yaml
- checkout
- setup node
- npm ci
- npm run lint
- npm test
- npm run build
```

## 6. Security requirements
- Secrets must use GitHub encrypted secrets
- Signing credentials should never be committed
- Cloud keys should be scoped only to needed workflows
- Release jobs should be limited to tags/manual approval

## 7. Folder structure
.github/
└── workflows/
├── ci.yml
└── release.yml

text

## 8. Testing requirements
- Workflow validates on PR
- Broken build/test should fail CI
- Release workflow can be dry-run tested

## 9. Definition of done
- CI workflow runs on push/PR
- lint, test, and build run successfully
- release workflow scaffold exists
- build artifacts can be uploaded
- secrets usage documented