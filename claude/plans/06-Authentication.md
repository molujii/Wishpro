# Module 6: Authentication — Implementation Plan

## Context

WhispPro needs secure API key storage and optional cloud sign-in. The current `modules/auth/` has only a minimal stub (`LocalAuth` with in-memory key storage). This plan fully implements Module 6: typed auth state machine, OS keychain secret storage (with SQLite fallback), an OAuth2 scaffold, IPC wiring, and tests.

**Privacy-first rule:** local mode must work with zero network calls or accounts. Cloud auth is strictly opt-in.

---

## Implementation Order

Dependencies flow bottom-up. Each step must complete before the next.

---

### Step 1 — `modules/auth/src/types.ts` (CREATE)

All auth domain types. No imports from Electron or DB.

```typescript
export type AuthState = 'local-only' | 'signed-out' | 'signing-in' | 'signed-in' | 'token-expired';
export type OAuthProvider = 'google' | 'github' | 'custom';

export interface AuthSession {
  state: AuthState;
  provider?: OAuthProvider;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;   // ISO-8601
  email?: string;
}

export type SecretKey =
  | 'auth.access-token'
  | 'auth.refresh-token'
  | 'api-key.openai'
  | 'api-key.anthropic'
  | 'api-key.google'
  | `api-key.${string}`;

export interface SecureStoreBackend { readonly name: 'keytar' | 'sqlite-fallback'; }

export interface ISecureStore {
  readonly backend: SecureStoreBackend;
  saveSecret(key: SecretKey, value: string): Promise<void>;
  getSecret(key: SecretKey): Promise<string | undefined>;
  deleteSecret(key: SecretKey): Promise<void>;
}

export interface IAuthService {
  getSession(): AuthSession;
  signIn(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  saveSecret(key: SecretKey, value: string): Promise<void>;
  getSecret(key: SecretKey): Promise<string | undefined>;
  deleteSecret(key: SecretKey): Promise<void>;
}

// Shape persisted in SQLite — no tokens, those live in keychain only
export interface PersistedAuthMeta {
  state: AuthState;
  provider?: OAuthProvider;
  email?: string;
  expiresAt?: string;
}
```

---

### Step 2 — `modules/auth/src/secureStore.ts` (CREATE)

Two-backend secret storage. Tries `keytar` (OS keychain) at runtime via `require()` inside a try/catch — so a missing native binding degrades gracefully to obfuscated SQLite instead of crashing the main process.

**Dependency injection pattern:** `saveSetting`, `getSetting`, `deleteSetting` are constructor params so tests can pass in-memory mocks.

Key details:
- Keychain service name: `'whispro'` (visible in macOS Keychain Access)
- SQLite fallback keys prefixed `secure:` to avoid collision with regular settings
- Obfuscation uses XOR with `os.hostname()` — device-specific, prevents casual plain-text accidents, not cryptographic encryption
- Logs a warning to console when falling back

`deleteSetting` does not exist on the current `settingsRepo` — it is injected in `app/main/index.ts` as a one-liner: `(key) => run(db => { db.prepare('DELETE FROM settings WHERE key = ?').run(key); })`.

---

### Step 3 — `modules/auth/src/oauthProvider.ts` (CREATE)

Scaffolded OAuth2 flow — not a full implementation per spec ("scaffold exists" DoD).

Exports:
- `OAuthConfig`, `OAuthResult` interfaces
- `OAuthCancelledError`, `OAuthFailedError` error classes
- `OAuthFlowProvider` class with injected `ShellOpener` and `DeepLinkListener`

`OAuthFlowProvider.startFlow(provider, clientId)`:
1. Builds authorization URL (PKCE params stubbed with TODO)
2. Calls `openExternal(authUrl)` — opens user's browser
3. Awaits deep-link callback on `whispro://oauth/callback` with 5-min timeout
4. Currently rejects with `OAuthCancelledError` until token exchange is implemented

Injecting `shell.openExternal` and deep-link listener (not importing from Electron) keeps this module testable in plain Node.

---

### Step 4 — `modules/auth/src/authService.ts` (CREATE)

State machine and orchestration. Holds live `AuthSession` in memory; persists non-sensitive metadata (`PersistedAuthMeta`) to SQLite settings under key `'auth.session-meta'`; delegates secrets to `SecureStore`.

Constructor deps (all injected):
- `secureStore: ISecureStore`
- `oauthFlow: OAuthFlowProvider`
- `saveMeta: (meta: PersistedAuthMeta) => Promise<void>`
- `loadMeta: () => Promise<PersistedAuthMeta | undefined>`
- `getClientId: (provider: OAuthProvider) => string | undefined`

Key methods:
- `hydrate()` — async, called once at startup after DB opens; restores session from persisted meta + keychain tokens
- `signIn(provider)` — transitions: `→ signing-in → signed-in | signed-out`; never throws on `OAuthCancelledError`
- `signOut()` — deletes both auth tokens from secure store, transitions to `signed-out`
- `saveSecret / getSecret / deleteSecret` — thin delegation to `secureStore`
- `getSession()` — returns a shallow copy (not internal reference)

**Critical:** constructor is synchronous; `app/main/index.ts` must `await authService.hydrate()` before registering IPC handlers.

---

### Step 5 — `modules/auth/src/index.ts` (MODIFY)

Preserve all existing exports (`AuthProvider` interface, `LocalAuth`) for backward compatibility. Add new exports:

```typescript
export type { AuthState, AuthSession, OAuthProvider, SecretKey, ISecureStore, IAuthService, PersistedAuthMeta, SecureStoreBackend } from './types';
export { SecureStore } from './secureStore';
export { AuthService } from './authService';
export { OAuthFlowProvider, OAuthCancelledError, OAuthFailedError } from './oauthProvider';
export type { OAuthConfig, OAuthResult, ShellOpener, DeepLinkListener } from './oauthProvider';
```

---

### Step 6 — `modules/auth/tests/secureStore.test.ts` (CREATE)

Uses in-memory `Map`-backed mock deps — no real SQLite or keytar required.

Test groups:
- **sqlite-fallback path** (force keytar throw via `jest.mock`): save/get/delete round-trip, obfuscation hides plain text, `backend.name === 'sqlite-fallback'`
- **keytar mock path** (`jest.mock('keytar')`): verifies `setPassword`/`getPassword`/`deletePassword` are called with correct service name and key

---

### Step 7 — `modules/auth/tests/authService.test.ts` (CREATE)

Test groups:
- Initial state before/after `hydrate()` with no stored meta
- Hydration restores `signed-in`, `token-expired`, `signed-out` correctly based on keychain content + expiry
- `signIn`: transitions through `signing-in`; resolves to `signed-out` on cancel; resolves to `signed-in` on success; saves tokens to store; persists meta
- `signOut`: deletes both token keys; transitions to `signed-out`; persists meta
- Secret passthrough: `saveSecret`/`getSecret`/`deleteSecret` delegate correctly
- `getSession()` returns a copy not a reference

---

### Step 8 — `app/main/ipc/channels.ts` (MODIFY — additive)

Append 6 new constants (all are `invoke`/`handle` — async request/response):

```typescript
export const IPC_GET_AUTH_STATE = 'ui:get-auth-state' as const;
export const IPC_SIGN_IN        = 'ui:sign-in'        as const;
export const IPC_SIGN_OUT       = 'ui:sign-out'       as const;
export const IPC_SAVE_SECRET    = 'ui:save-secret'    as const;
export const IPC_GET_SECRET     = 'ui:get-secret'     as const;
export const IPC_DELETE_SECRET  = 'ui:delete-secret'  as const;
```

---

### Step 9 — `app/main/types/ipc.ts` (MODIFY — additive)

Add auth IPC payload types, importing from `@modules/auth`:

```typescript
import type { AuthSession, OAuthProvider, SecretKey } from '@modules/auth';

export type SignInPayload       = { provider: OAuthProvider };
export type SignInResult        = { success: boolean; session: AuthSession; error?: string };
export type SaveSecretPayload   = { key: SecretKey; value: string };
export type SaveSecretResult    = { ok: boolean };
export type GetSecretPayload    = { key: SecretKey };
export type GetSecretResult     = { value: string | undefined };
export type DeleteSecretPayload = { key: SecretKey };
export type DeleteSecretResult  = { ok: boolean };
```

---

### Step 10 — `app/main/ipc/registerIpcHandlers.ts` (MODIFY)

Extend function signature: `registerIpcHandlers(txCtrl, stateCtrl, authService: IAuthService)`.

Register 6 new `ipcMain.handle()` calls. `signIn` errors are caught and returned as `{ success: false, error }` — re-throwing from a handle callback causes unhandled rejections in the renderer.

---

### Step 11 — `app/main/preload/index.ts` (MODIFY)

Add 6 auth methods to the existing `contextBridge.exposeInMainWorld('electronAPI', {...})` call:

```typescript
getAuthState: (): Promise<AuthSession> => ipcRenderer.invoke(IPC_GET_AUTH_STATE),
signIn:       (provider: OAuthProvider): Promise<SignInResult> => ipcRenderer.invoke(IPC_SIGN_IN, { provider }),
signOut:      (): Promise<void> => ipcRenderer.invoke(IPC_SIGN_OUT),
saveSecret:   (key: SecretKey, value: string): Promise<SaveSecretResult> => ipcRenderer.invoke(IPC_SAVE_SECRET, { key, value }),
getSecret:    (key: SecretKey): Promise<GetSecretResult> => ipcRenderer.invoke(IPC_GET_SECRET, { key }),
deleteSecret: (key: SecretKey): Promise<DeleteSecretResult> => ipcRenderer.invoke(IPC_DELETE_SECRET, { key }),
```

---

### Step 12 — `app/main/index.ts` (MODIFY)

In `app.whenReady()`:

1. Register `'whispro'` as default protocol client for OAuth deep links
2. Wire `app.on('open-url', ...)` → `Set<callback>` dispatcher
3. Construct `SecureStore` with real DB functions + inline `deleteSetting`
4. Construct `OAuthFlowProvider` with `shell.openExternal` + deep-link listener
5. Construct `AuthService` with all deps; `getClientId` reads `process.env.OAUTH_CLIENT_ID_${PROVIDER}`
6. `await authService.hydrate()` — **before** `registerIpcHandlers`
7. Pass `authService` as 3rd arg to `registerIpcHandlers`

---

### Step 13 — `package.json` (MODIFY)

```json
"dependencies": { "keytar": "^7.9.0", ... }
"devDependencies": { "@types/keytar": "^4.4.2", ... }
```

After install, native rebuild is required: `npx electron-rebuild -f -w keytar`. Add to `postinstall` script or document in dev setup.

---

## Critical Files

| File | Action |
|------|--------|
| `modules/auth/src/types.ts` | CREATE |
| `modules/auth/src/secureStore.ts` | CREATE |
| `modules/auth/src/oauthProvider.ts` | CREATE |
| `modules/auth/src/authService.ts` | CREATE |
| `modules/auth/src/index.ts` | MODIFY |
| `modules/auth/tests/secureStore.test.ts` | CREATE |
| `modules/auth/tests/authService.test.ts` | CREATE |
| `app/main/ipc/channels.ts` | MODIFY |
| `app/main/types/ipc.ts` | MODIFY |
| `app/main/ipc/registerIpcHandlers.ts` | MODIFY |
| `app/main/preload/index.ts` | MODIFY |
| `app/main/index.ts` | MODIFY |
| `package.json` | MODIFY |

Existing reusable utilities:
- `modules/db/src/settingsRepo.ts` — `saveSetting`, `getSetting` (reused for auth meta + fallback store)
- `app/main/ipc/registerIpcHandlers.ts` — existing handler registration pattern (extended, not replaced)
- `app/main/preload/index.ts` — existing `electronAPI` bridge (extended, not replaced)

---

## Known Gotchas

1. **`keytar` native rebuild** — must run `electron-rebuild` after `npm install`; the try/catch in `SecureStore` handles missing binding gracefully at runtime but CI needs the rebuild step for keychain tests.
2. **`deleteSetting` missing from `settingsRepo`** — injected as an inline one-liner in `app/main/index.ts`; no DB module changes needed.
3. **`tsconfig.main.json` path aliases** — must include `"@modules/auth": ["modules/auth/src/index.ts"]` if not already present.
4. **`hydrate()` must be awaited before IPC registration** — forgetting the await serves stale `local-only` state to returning signed-in users.
5. **OAuth deep links: Mac only for now** — `app.on('open-url')` fires on macOS; Windows uses `second-instance` event (TODO comment left in code).

---

## Verification

1. `npm test -- --testPathPattern=modules/auth` — all auth unit tests pass
2. Manual: launch app, open settings panel — auth state shows `local-only`
3. Manual: call `electronAPI.saveSecret('api-key.openai', 'sk-test')` from renderer DevTools — value retrievable via `getSecret`, absent from SQLite in plain text
4. Manual: call `electronAPI.signIn('google')` — browser opens (or OAuthCancelledError returned cleanly), state transitions visible via `getAuthState()`
5. Manual: call `electronAPI.signOut()` — state returns to `signed-out`, tokens absent from keychain
