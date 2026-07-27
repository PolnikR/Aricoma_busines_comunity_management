# X-User Header on All API Calls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send an `X-User` header (value `admin` today) on every real backend call, via a single `apiFetch` wrapper fed by a `UserContext`, so future real auth is a low-effort drop-in.

**Architecture:** A React `UserContext` (mirroring `LanguageContext`) is the source of truth for the current user. It writes through to a plain module (`currentUser.ts`) that the non-React API layer can read. A shared `apiFetch` wrapper reads that module and injects a locked `X-User` header on every request. All 5 API files are refactored to call `apiFetch` instead of `fetch`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, MSW, Zod.

## Global Constraints

- **No new test files.** Correctness is proven by existing suites staying green + `lint`/`typecheck`/`build`. Existing tests may be *edited* if a header assertion breaks.
- **No git commits.** Tasks end at a verification gate, not a commit.
- **`X-User` is locked** — set last in the header merge so a caller can never override it.
- **Client-only SPA constraint** — the `currentUser.ts` module singleton is safe only because there is one user per browser runtime; it must not survive a move to SSR unchanged.
- Follow the existing `LanguageContext` pattern for the new context (Provider + `useX` hook + `eslint-disable` on the hook export).

---

### Task 1: `currentUser.ts` bridge module

**Files:**
- Create: `src/shared/api/currentUser.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface CurrentUser { username: string; role: string }`
  - `getCurrentUser(): CurrentUser`
  - `setCurrentUser(user: CurrentUser): void`
  - `resetCurrentUser(): void`

- [ ] **Step 1: Create the module**

```ts
// src/shared/api/currentUser.ts
// Non-React bridge: holds the current user so the plain API layer (apiFetch)
// can read it without a React hook. UserContext writes through to it; the
// context remains the single source of truth. Safe only in a browser-only
// SPA (one user per runtime) — NOT SSR-safe.
export interface CurrentUser {
  username: string
  role: string
}

const DEFAULT_USER: CurrentUser = { username: 'admin', role: 'admin' }

let currentUser: CurrentUser = DEFAULT_USER

export function getCurrentUser(): CurrentUser {
  return currentUser
}

export function setCurrentUser(user: CurrentUser): void {
  currentUser = user
}

export function resetCurrentUser(): void {
  currentUser = DEFAULT_USER
}
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no errors.

---

### Task 2: `apiFetch` wrapper

**Files:**
- Create: `src/shared/api/apiClient.ts`

**Interfaces:**
- Consumes: `getCurrentUser` from `src/shared/api/currentUser.ts` (Task 1).
- Produces: `apiFetch(input: string, init?: RequestInit): Promise<Response>`

- [ ] **Step 1: Create the wrapper**

```ts
// src/shared/api/apiClient.ts
import { getCurrentUser } from './currentUser'

// Single choke point for backend calls. Injects a default Accept header and a
// locked X-User identity header, then delegates to the global fetch. Returns
// the raw Response — callers keep their own .ok checks, status branching, and
// Zod parsing unchanged.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' })
  // Caller-supplied headers (e.g. Content-Type) override the defaults.
  new Headers(init.headers).forEach((value, key) => {
    headers.set(key, value)
  })
  // X-User is set LAST so it always wins — an identity header must not be
  // overridable by a caller.
  headers.set('X-User', getCurrentUser().username)
  return fetch(input, { ...init, headers })
}
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no errors.

---

### Task 3: `UserContext`

**Files:**
- Create: `src/contexts/UserContext.tsx`

**Interfaces:**
- Consumes: `setCurrentUser`, `CurrentUser` from `src/shared/api/currentUser.ts` (Task 1).
- Produces:
  - `UserProvider({ children }: { children: ReactNode })`
  - `useUserContext(): { user: User; setUser: (user: User) => void }`
  - `interface User { username: string; role: string }`

- [ ] **Step 1: Create the context (mirrors LanguageContext)**

```tsx
// src/contexts/UserContext.tsx
import type { ReactNode } from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { setCurrentUser } from '@/shared/api/currentUser'

export interface User {
  username: string
  role: string
}

interface UserContextType {
  user: User
  setUser: (user: User) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// No auth yet: a single hardcoded admin user. When auth lands, seed this from
// the authenticated session instead — nothing else in the app changes.
const DEFAULT_USER: User = { username: 'admin', role: 'admin' }

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User>(DEFAULT_USER)

  // Write through to the non-React bridge so apiFetch sees the current user.
  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserContext() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUserContext must be used within UserProvider')
  }

  return context
}
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no errors.

---

### Task 4: Wire `UserProvider` into the app

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `UserProvider` from `src/contexts/UserContext` (Task 3).
- Produces: nothing.

- [ ] **Step 1: Import UserProvider**

Add after the `LanguageProvider` import in `src/main.tsx`:

```tsx
import { LanguageProvider } from '@/contexts/LanguageContext'
import { UserProvider } from '@/contexts/UserContext'
```

- [ ] **Step 2: Wrap `<App />` inside LanguageProvider**

Replace the render block:

```tsx
  createRoot(rootElement).render(
    <StrictMode>
      <LanguageProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </LanguageProvider>
    </StrictMode>,
  )
```

- [ ] **Step 3: Verify it typechecks, lints, and builds**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS.

---

### Task 5: Refactor `discoveryInventoryApi.ts`

**Files:**
- Modify: `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- Test (existing, do not create): `src/features/discovery-inventory/api/discoveryInventoryApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/shared/api/apiClient` (Task 2).
- Produces: nothing (public API unchanged).

- [ ] **Step 1: Add the import**

At the top of the file, after the existing imports:

```ts
import { apiFetch } from '@/shared/api/apiClient'
```

- [ ] **Step 2: Replace the fetch call**

Replace:

```ts
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
```

with:

```ts
  const response = await apiFetch(url)
```

- [ ] **Step 3: Run the file's existing tests**

Run: `npm test -- src/features/discovery-inventory/api/discoveryInventoryApi.test.ts`
Expected: PASS. If a test asserts on the exact headers passed to `fetch`, update that assertion to include `'X-User': 'admin'` (editing an existing test is allowed; creating a new one is not).

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

---

### Task 6: Refactor `providersApi.ts`

**Files:**
- Modify: `src/features/providers-connectors/providers/api/providersApi.ts`
- Test (existing, do not create): `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/shared/api/apiClient` (Task 2).
- Produces: nothing (public API unchanged).

- [ ] **Step 1: Add the import**

```ts
import { apiFetch } from '@/shared/api/apiClient'
```

- [ ] **Step 2: Replace `fetchProviders` call**

Replace:

```ts
  const response = await fetch(GET_PROVIDERS_URL, {
    headers: { Accept: 'application/json' },
  })
```

with:

```ts
  const response = await apiFetch(GET_PROVIDERS_URL)
```

- [ ] **Step 3: Replace `submitProvider` call**

Replace:

```ts
  const response = await fetch(SUBMIT_PROVIDER_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
  })
```

with:

```ts
  const response = await apiFetch(SUBMIT_PROVIDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
  })
```

- [ ] **Step 4: Replace `deleteProvider` call**

Replace:

```ts
  const response = await fetch(`${DELETE_PROVIDER_URL}?provider_id=${encodeURIComponent(providerId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
```

with:

```ts
  const response = await apiFetch(`${DELETE_PROVIDER_URL}?provider_id=${encodeURIComponent(providerId)}`, {
    method: 'DELETE',
  })
```

- [ ] **Step 5: Run the file's existing tests**

Run: `npm test -- src/features/providers-connectors/providers/api/providersApi.test.ts`
Expected: PASS. If a test asserts on exact headers, add `'X-User': 'admin'` to that assertion.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

---

### Task 7: Refactor `vdisksApi.ts`

**Files:**
- Modify: `src/features/discovery-inventory/virtual-machines/api/vdisksApi.ts`
- Test (existing, do not create): `src/features/discovery-inventory/virtual-machines/api/vdisksApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/shared/api/apiClient` (Task 2).
- Produces: nothing (public API unchanged).

- [ ] **Step 1: Add the import**

```ts
import { apiFetch } from '@/shared/api/apiClient'
```

- [ ] **Step 2: Replace the fetch call**

Replace:

```ts
  const response = await fetch(`${VDISKS_BY_VM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
```

with:

```ts
  const response = await apiFetch(`${VDISKS_BY_VM_URL}?${params.toString()}`)
```

- [ ] **Step 3: Run the file's existing tests**

Run: `npm test -- src/features/discovery-inventory/virtual-machines/api/vdisksApi.test.ts`
Expected: PASS. If a test asserts on exact headers, add `'X-User': 'admin'` to that assertion.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

---

### Task 8: Refactor `tagsApi.ts`

**Files:**
- Modify: `src/features/discovery-inventory/api/tagsApi.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/shared/api/apiClient` (Task 2).
- Produces: nothing (public API unchanged).

- [ ] **Step 1: Add the import**

```ts
import { apiFetch } from '@/shared/api/apiClient'
```

- [ ] **Step 2: Replace the fetch call**

Replace:

```ts
  const response = await fetch('/api/tags', {
    headers: { Accept: 'application/json' },
  })
```

with:

```ts
  const response = await apiFetch('/api/tags')
```

- [ ] **Step 3: Typecheck, lint, and run any tests touching tags**

Run: `npm run typecheck && npm run lint`
Expected: PASS. (`tagsApi.ts` has no dedicated test file; it is exercised via `useDiscoveryInventory.test.tsx`.)

---

### Task 9: Refactor `recoveryApplicationApi.ts`

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationApi.ts`
- Test (existing, do not create): `src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/shared/api/apiClient` (Task 2).
- Produces: nothing (public API unchanged).

- [ ] **Step 1: Add the import**

```ts
import { apiFetch } from '@/shared/api/apiClient'
```

- [ ] **Step 2: Replace the `fetchRecoveryApplications` fallback call**

The localStorage read stays untouched. Replace only the fetch in the `try` block:

```ts
    const response = await fetch(RECOVERY_APPS_ENDPOINT)
```

with:

```ts
    const response = await apiFetch(RECOVERY_APPS_ENDPOINT)
```

- [ ] **Step 3: Replace the `fetchRecoveryApplication` call**

Replace:

```ts
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`)
```

with:

```ts
  const response = await apiFetch(`${RECOVERY_APPS_ENDPOINT}/${id}`)
```

- [ ] **Step 4: Replace the `submitRecoveryApplicationDag` call**

Replace:

```ts
    response = await fetch(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
```

with:

```ts
    response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
```

- [ ] **Step 5: Replace the `createRecoveryApplication` call**

Replace:

```ts
  const response = await fetch(RECOVERY_APPS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission ? { ...data, submission } : data),
  })
```

with:

```ts
  const response = await apiFetch(RECOVERY_APPS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission ? { ...data, submission } : data),
  })
```

- [ ] **Step 6: Replace the `updateRecoveryApplication` call**

Replace:

```ts
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
```

with:

```ts
  const response = await apiFetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
```

- [ ] **Step 7: Replace the `deleteRecoveryApplication` call**

Replace:

```ts
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
```

with:

```ts
  const response = await apiFetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
```

- [ ] **Step 8: Run the file's existing tests**

Run: `npm test -- src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationApi.test.ts`
Expected: PASS. If a test asserts on exact headers, add `'X-User': 'admin'` to that assertion.

- [ ] **Step 9: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

---

### Task 10: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the full build pipeline**

Run: `npm run build`
Expected: PASS (this runs `lint && typecheck && test && vite build` per package.json).

- [ ] **Step 2: Confirm no stray direct `fetch` remains in the API layer**

Run: `git grep -n "await fetch(" -- "src/**/*Api.ts" "src/**/recoveryApplicationApi.ts"`
Expected: no matches (every backend call now goes through `apiFetch`). The localStorage read in `fetchRecoveryApplications` is not a `fetch` and correctly does not appear.

---

## Notes for the Implementer

- **Why the bridge exists:** `apiFetch` is a plain function and cannot call the `useUserContext()` hook. `currentUser.ts` is the readable mirror the API layer uses; `UserContext` writes to it via `useEffect`.
- **Header assertions in existing tests:** most API tests mock the global `fetch` and assert on URL/method/body, not exact headers — those pass unchanged. Only update an assertion if it explicitly checks the headers object; add `'X-User': 'admin'`.
- **Default before first render:** `currentUser.ts` starts at `admin`, so any call made before the provider's first effect still sends the correct value.
