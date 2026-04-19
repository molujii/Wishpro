# Module 6 – Authentication / Secure Config – Spec

## 1. Purpose
Manage user authentication and secure credentials for WhispPro.

For local-only usage, no account login is required. This module mainly handles:
- secure storage of API keys / tokens
- optional sign-in for future cloud sync
- access control for cloud-only features

## 2. Scope
**In scope**: local secure credential storage, auth state, optional OAuth design, cloud feature gating  
**Out of scope**: transcript storage logic, speech/text providers, deployment auth infrastructure

## 3. Product direction
WhispPro is designed as a privacy-first local desktop app, so local use should work without mandatory sign-in.[file:1]

If the user enables cloud sync or cloud AI providers later, this module should support:
- OAuth2-based login
- secure token storage
- account/session management
- sign-out and revoke flows

## 4. Core requirements

### Local-first auth model
1. No login required for fully local usage.
2. App should still support secure storage for local config such as API keys.
3. OS-level secure storage / keychain should be preferred for secrets.[file:1]

### Optional cloud auth
4. Cloud sync or cloud provider access should require explicit user opt-in.[file:1]
5. OAuth2 should be the preferred design for future cloud sign-in.[file:1]
6. Auth module should track signed-in state separately from local app usage.

### Secure config
7. Store secrets like:
   - OpenAI API key
   - Anthropic API key
   - sync token
   - refresh token
8. Secrets must not be stored in plain text config files.
9. Retrieval APIs should be simple for backend modules to consume.

### Session state
10. Support auth states such as:
   - local-only
   - signed-out
   - signing-in
   - signed-in
   - token-expired
11. Backend and UI should be able to query auth state.

## 5. Example types
```ts
type AuthState = 'local-only' | 'signed-out' | 'signing-in' | 'signed-in' | 'token-expired';

interface AuthSession {
  state: AuthState;
  provider?: 'google' | 'github' | 'custom';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  email?: string;
}
```

## 6. Main functions
- `saveSecret(key, value)`
- `getSecret(key)`
- `deleteSecret(key)`
- `getAuthState()`
- `signInWithOAuth(provider)`
- `signOut()`

Initial implementation may stub OAuth and only fully implement secure secret storage.

## 7. Backend contract
```ts
const apiKey = await authService.getSecret('openai.apiKey');
const state = await authService.getAuthState();
if (state !== 'signed-in') {
  // block cloud sync or cloud-only feature
}
```

## 8. Security requirements
- Use OS keychain / secure store where possible.[file:1]
- Never log tokens or secrets.
- Keep cloud features opt-in only.[file:1]
- Expired tokens must fail safely.

## 9. Folder structure
modules/auth/
├── index.ts
├── types.ts
├── authService.ts
├── secureStore.ts
├── oauthProvider.ts
└── tests/

text

## 10. Testing
- save/get/delete secret
- auth state transitions
- sign-out clears tokens
- cloud feature blocked if not signed in
- OAuth flow can be mocked

## 11. Definition of done
- Local mode works without login
- Secure secret storage works
- Auth state is queryable
- Optional OAuth flow scaffold exists
- Tests pass for secret storage and auth state behavior