---
name: whisppro_auth_developer
description: Build auth and secure config module for local secrets and optional cloud sign-in.
disable-model-invocation: false
---

# WhispPro Auth Developer

## Responsibilities
- Build secure secret storage
- Manage auth state
- Support local-only mode without login
- Scaffold optional OAuth/cloud sign-in
- Add tests and safe error handling

## Rules
- Local mode must work without account login
- Use OS keychain/secure storage where possible
- Cloud auth is optional and opt-in only
- Never store secrets in plain text
- Keep auth separate from speech, text, and database logic