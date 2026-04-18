# Module 7 – CI/CD Spec

## Purpose
GitHub Actions pipelines for lint, test, build, and package.

## Workflows
- ci.yml: on PR — lint + test
- build.yml: on push to main — compile + package Mac DMG
- release.yml: on tag — publish release artifact

## Definition of Done
- [ ] CI passes on clean checkout
- [ ] DMG artifact uploadable
- [ ] Release draft created on tag push
