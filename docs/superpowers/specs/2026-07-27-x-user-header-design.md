# Design: X-User Header on All API Calls (Future-Ready User Context)

**Date:** 2026-07-27
**Status:** Approved (pending user review of this spec)

## Overview

Every real backend call must send an `X-User` header identifying the current
user (`X-User: admin` today, matching the backend's expectation):

```
curl -X 'GET' 'http://10.99.99.54:8000/vms?provider_id=vmware-vcenter-01' \
  -H 'accept: application/json' \
  -H 'X-User: admin'
```

Authentication is not implemented yet, so there is a single hardcoded user
(`admin`) with role `admin`. The design must make the *future* wiring of a real
authenticated user a **low-effort drop-in**: when auth lands, only the user
seed and (optionally) the header line change — no API file or call site is
touched.

`X-User: admin` is a deliberate **trusted-header placeholder**, not a production
auth mechanism. Real auth (tokens, 401/refresh) will replace the header value
later; the architecture below is the permanent home for that change.

## Architecture Decisions

- **User source of truth = a React `UserContext`**, mirroring the existing
  `LanguageContext` pattern (Provider + `useX` hook). Chosen over a bare
  constant or env var because it is the natural home for a role once auth
  exists, and lets components (e.g. `UserMenu`) read the real user later.
- **A single `apiFetch` wrapper is the only choke point** that injects the
  header. Chosen over editing each call site (12+ sites, easy to miss, no
  future-proofing) and over monkey-patching global `fetch` (too magic, breaks
  MSW/mocks, hard to test).
- **A non-React bridge module (`currentUser.ts`)** connects the two: `apiFetch`
  is a plain function and cannot call a React hook, so the context writes the
  current user into a module-level variable that `apiFetch` reads.
- **Uniform rule: every `/api/*` fetch goes through `apiFetch`.** No per-route
  exceptions to remember; sending `X-User` to a mock/MSW route is harmless.

### Constraint: client-only SPA

The `currentUser.ts` module singleton is safe **because this is a browser-only
Vite SPA** — exactly one user per JS runtime. If the app ever moves to SSR
(server rendering), a module global would be shared across all users' requests
(a data-leak bug). This pattern must not survive a move to SSR unchanged.

## Components

### 1. `src/contexts/UserContext.tsx` (new)

Mirrors `LanguageContext`.

```ts
interface User { username: string; role: string }

interface UserContextType {
  user: User
  setUser: (user: User) => void
}
```

- Seeded today with `{ username: 'admin', role: 'admin' }`.
- `useUserContext()` hook for React components.
- On every `user` change, a `useEffect` calls `setCurrentUser(user)` to keep the
  bridge in sync. The context is the single source of truth; the bridge is a
  write-through mirror only.
- **Future auth drop-in:** replace the `admin` seed with the authenticated
  session user. Nothing else changes.

### 2. `src/shared/api/currentUser.ts` (new)

The non-React bridge — a plain module holding the current user so the API layer
can read it without a hook.

```ts
interface CurrentUser { username: string; role: string }

const DEFAULT_USER: CurrentUser = { username: 'admin', role: 'admin' }
let currentUser: CurrentUser = DEFAULT_USER

export function getCurrentUser(): CurrentUser { return currentUser }
export function setCurrentUser(user: CurrentUser): void { currentUser = user }
export function resetCurrentUser(): void { currentUser = DEFAULT_USER }
```

- Write-through only (context → bridge). Never read back into the context.
- `resetCurrentUser()` exists so tests that touch this module can restore the
  default and avoid cross-test leakage.
- Before the provider's first effect runs, the bridge holds `DEFAULT_USER`
  (`admin`) — harmless because the default is `admin`.

### 3. `src/shared/api/apiClient.ts` (new)

The single choke point.

```ts
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' })
  // caller-supplied headers (e.g. Content-Type) merge in and override the defaults
  new Headers(init.headers).forEach((value, key) => { headers.set(key, value) })
  // X-User is set LAST so it always wins — an identity header must not be
  // overridable by a caller. Locked to whatever the user context holds.
  headers.set('X-User', getCurrentUser().username)
  return fetch(input, { ...init, headers })
}
```

- Injects a default `Accept: application/json` that callers may override, and a
  `Content-Type` etc. passed by the caller is preserved.
- **`X-User` is locked** — set last, so it always reflects the current user and
  cannot be overridden by a caller. This is the production-safe default for an
  identity header.
- Returns the **raw `Response`** — no error transformation. Callers keep their
  own `.ok` checks, status branching, and Zod parsing unchanged.

## Data Flow

```
UserContext (React state, source of truth)
   │  useEffect on change
   ▼
setCurrentUser({ username, role })   ← currentUser.ts (module var)
   │  getCurrentUser()
   ▼
apiFetch(path, init)  →  injects  X-User: <username>  →  fetch()
```

## Wiring

`src/main.tsx` — wrap `<App/>` in `<UserProvider>` inside `LanguageProvider`:

```tsx
<LanguageProvider>
  <UserProvider>
    <App />
  </UserProvider>
</LanguageProvider>
```

## Refactor Scope

Swap `fetch(...)` → `apiFetch(...)` and drop the now-redundant hand-written
`Accept` header in:

- `src/features/discovery-inventory/api/discoveryInventoryApi.ts` (2 calls)
- `src/features/providers-connectors/providers/api/providersApi.ts` (3 calls)
- `src/features/discovery-inventory/virtual-machines/api/vdisksApi.ts` (1 call)
- `src/features/discovery-inventory/api/tagsApi.ts` (1 call)
- `src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationApi.ts`
  (real calls: `submit_dag`, recovery-app CRUD; the localStorage read stays as-is)

## Error Handling

`apiFetch` does not swallow or transform errors — it returns the raw `Response`
and lets `fetch` rejections propagate unchanged. All existing error semantics
are preserved:

- Each file's `!response.ok` throw.
- `discoveryInventoryApi`'s 400/500 → empty-inventory branch.
- `submitRecoveryApplicationDag`'s network-error wrapping.

## Verification (no new test files)

Per the user's constraint, this change adds **no new test files**. Correctness
is confirmed by the existing suites staying green plus static checks:

- `npm test` — especially `discoveryInventoryApi.test.ts`, `providersApi.test.ts`,
  `vdisksApi.test.ts`. If any existing test asserts on request headers, confirm
  it still passes with `X-User` present.
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Out of Scope

- Real authentication (tokens, login, 401/refresh).
- Role-based authorization logic — the `role` field is carried but not yet used.
- Changing the backend contract or the Vite proxy.
- New test files.

## Future Auth Drop-In (why effort stays low)

When real auth is built, only two spots change:

1. `UserContext` seed — populate from the authenticated session instead of the
   `admin` constant.
2. (If moving to token auth) the single header line in `apiFetch`.

All 5 API files and every call site remain untouched.
