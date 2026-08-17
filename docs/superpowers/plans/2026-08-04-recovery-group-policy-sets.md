# Recovery Group Policy Sets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `policy-sets` CRUD feature (sets of existing snapshot policies) and wire a required policy-set attachment into the recovery group model, API, and creation/edit wizard.

**Architecture:** `policy-sets` is a new sibling feature under `src/features/recovery-plans/`, built as a near-exact structural clone of the existing `snapshot-policies` feature (same list/submit/delete API shape, same hook/component/page layering). `RecoveryGroup`/`RecoveryGroupDraft` gain a required `policySetId` field threaded through the schema, mapping, validation, and a new final step in the existing `RecoveryGroupBuilder` wizard.

**Tech Stack:** React 19, TypeScript, Zod, TanStack Query, Vitest + Testing Library, existing shared UI components (`Modal`, `ConfirmDialog`, `DataTable`, `SelectableCard`, `FormControls`).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-08-04-recovery-group-policy-sets-design.md` — follow it for placement/scope decisions.
- Backend endpoints (exact, already confirmed working): `GET /api/get_policy_sets`, `POST /api/submit_policy_set`, `DELETE /api/delete_policy_set?policy_set_id=<id>`. Submit and delete both return the full updated `{ policy_sets: [...] }` list, same shape as GET.
- `policy_set_id` is a required field on both `GET /api/get_recovery_groups` and `POST /api/submit_recovery_group` (confirmed from a live response sample) — attaching a policy set to a recovery group is **required**, not optional.
- All locale files (`src/locales/en.json`, `sk.json`, `cs.json`) must stay in exact key-parity (currently 1052 keys each) — every new key added to `en.json` must be added to `sk.json` and `cs.json` too.
- Follow the existing `snapshot-policies` feature's file layout and code conventions exactly (`model/`, `api/`, `api/schemas/`, `hooks/`, `components/`, `pages/`) — do not invent new patterns.
- Do not modify the `snapshot-policies` feature itself; it is only consumed read-only (via `useSnapshotPolicies`) by the new `policy-sets` picker UI.

---

### Task 1: Policy set model, schema, and API client

**Files:**
- Create: `src/features/recovery-plans/policy-sets/model/policySetTypes.ts`
- Create: `src/features/recovery-plans/policy-sets/api/schemas/policySetsSchema.ts`
- Create: `src/features/recovery-plans/policy-sets/api/policySetQueryKeys.ts`
- Create: `src/features/recovery-plans/policy-sets/api/policySetsApi.ts`
- Modify: `src/config/apiEndpoints.ts`
- Test: `src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts`
- Test: `src/features/recovery-plans/policy-sets/api/policySetQueryKeys.test.ts`

**Interfaces:**
- Produces: `PolicySet { id: string; name: string; description: string; policyIds: string[] }`, `PolicySetSubmitData` (alias of `PolicySet`), `fetchPolicySets(): Promise<PolicySet[]>`, `submitPolicySet(policySet: PolicySetSubmitData): Promise<PolicySet[]>`, `deletePolicySet(policySetId: string): Promise<PolicySet[]>`, `policySetKeys.all`, `policySetKeys.list()`, `API_ENDPOINTS.policySets.{list,submit,delete}`.

- [ ] **Step 1: Write the failing API tests**

Create `src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import {
  deletePolicySet,
  fetchPolicySets,
  submitPolicySet,
} from './policySetsApi'

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  policyIds: ['medium-6h'],
}

const wirePolicySet = {
  id: policySet.id,
  name: policySet.name,
  description: policySet.description,
  policy_ids: policySet.policyIds,
}

function stubFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(payload === null ? null : JSON.stringify(payload), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPolicySets', () => {
  it('loads, validates and normalizes policy sets', async () => {
    const fetchMock = stubFetch({
      policy_sets: [wirePolicySet, { ...wirePolicySet, id: 'archive', policy_ids: ['low-24h'] }],
    })

    await expect(fetchPolicySets()).resolves.toEqual([
      policySet,
      { ...policySet, id: 'archive', policyIds: ['low-24h'] },
    ])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_policy_sets')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it.each([
    ['missing policy set list', {}],
    ['empty policy ids', { policy_sets: [{ ...wirePolicySet, policy_ids: [] }] }],
  ])('rejects malformed responses: %s', async (_case, payload) => {
    stubFetch(payload)
    await expect(fetchPolicySets()).rejects.toBeInstanceOf(Error)
  })

  it('throws a stable error for an unsuccessful list request', async () => {
    stubFetch(null, 503)
    await expect(fetchPolicySets()).rejects.toThrow(
      'Get policy sets request failed with status 503',
    )
  })
})

describe('submitPolicySet', () => {
  it('maps the frontend model to the backend contract and validates the response', async () => {
    const fetchMock = stubFetch({ policy_sets: [wirePolicySet] })
    const submitData: PolicySetSubmitData = { ...policySet }

    await expect(submitPolicySet(submitData)).resolves.toEqual([policySet])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_policy_set')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(wirePolicySet))
    const headers = new Headers(init.headers)
    expect(headers.get('X-User')).toBe('admin')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('rejects invalid input before calling the backend', async () => {
    const fetchMock = stubFetch({ policy_sets: [] })

    await expect(submitPolicySet({ ...policySet, policyIds: [] })).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deletePolicySet', () => {
  it('URL-encodes policy_set_id and validates the returned list', async () => {
    const fetchMock = stubFetch({ policy_sets: [] })

    await expect(deletePolicySet('tier2/main apps')).resolves.toEqual([])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_policy_set?policy_set_id=tier2%2Fmain%20apps')
    expect(init.method).toBe('DELETE')
  })

  it('rejects an empty policy set id without calling the backend', async () => {
    const fetchMock = stubFetch({ policy_sets: [] })

    await expect(deletePolicySet('')).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

Create `src/features/recovery-plans/policy-sets/api/policySetQueryKeys.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { policySetKeys } from './policySetQueryKeys'

describe('policySetKeys', () => {
  it('provides a stable isolated list cache key', () => {
    expect(policySetKeys.all).toEqual(['policy-sets'])
    expect(policySetKeys.list()).toEqual(['policy-sets', 'list'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/recovery-plans/policy-sets/api --no-coverage`
Expected: FAIL — `./policySetsApi` and `./policySetQueryKeys` cannot be found.

- [ ] **Step 3: Create the model, schema, query keys, and API client**

Create `src/features/recovery-plans/policy-sets/model/policySetTypes.ts`:

```ts
export interface PolicySet {
  id: string
  name: string
  description: string
  policyIds: string[]
}

// Kept as a separate public contract even though the backend currently accepts
// every field returned by reads. This allows read and write shapes to evolve independently.
export type PolicySetSubmitData = PolicySet
```

Create `src/features/recovery-plans/policy-sets/api/schemas/policySetsSchema.ts`:

```ts
import { z } from 'zod'

export const policySetSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  policyIds: z.array(z.string().min(1)).min(1),
})

export const policySetWireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  policy_ids: z.array(z.string().min(1)).min(1),
})

export const policySetsResponseSchema = z.object({
  policy_sets: z.array(policySetWireSchema),
})

export type PolicySetWire = z.infer<typeof policySetWireSchema>
```

Create `src/features/recovery-plans/policy-sets/api/policySetQueryKeys.ts`:

```ts
export const policySetKeys = {
  all: ['policy-sets'] as const,
  list: () => [...policySetKeys.all, 'list'] as const,
}
```

Create `src/features/recovery-plans/policy-sets/api/policySetsApi.ts`:

```ts
import { z } from 'zod'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { apiFetch } from '@/shared/api/apiClient'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import {
  policySetsResponseSchema,
  policySetSubmitSchema,
  type PolicySetWire,
} from './schemas/policySetsSchema'

const policySetIdSchema = z.string().min(1)

function requireSuccessfulResponse(response: Response, operation: string): Response {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
  return response
}

function fromWire(policySet: PolicySetWire): PolicySet {
  return {
    id: policySet.id,
    name: policySet.name,
    description: policySet.description,
    policyIds: policySet.policy_ids,
  }
}

function toWire(policySet: PolicySetSubmitData): PolicySetWire {
  const validated = policySetSubmitSchema.parse(policySet)
  return {
    id: validated.id,
    name: validated.name,
    description: validated.description,
    policy_ids: validated.policyIds,
  }
}

async function parsePolicySets(response: Response): Promise<PolicySet[]> {
  const payload: unknown = await response.json()
  return policySetsResponseSchema.parse(payload).policy_sets.map(fromWire)
}

export async function fetchPolicySets(): Promise<PolicySet[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.policySets.list),
    'Get policy sets',
  )
  return parsePolicySets(response)
}

export async function submitPolicySet(
  policySet: PolicySetSubmitData,
): Promise<PolicySet[]> {
  const wirePolicySet = toWire(policySet)
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.policySets.submit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePolicySet),
    }),
    'Submit policy set',
  )
  return parsePolicySets(response)
}

export async function deletePolicySet(policySetId: string): Promise<PolicySet[]> {
  const validatedPolicySetId = policySetIdSchema.parse(policySetId)
  const response = requireSuccessfulResponse(
    await apiFetch(
      `${API_ENDPOINTS.policySets.delete}?policy_set_id=${encodeURIComponent(validatedPolicySetId)}`,
      { method: 'DELETE' },
    ),
    'Delete policy set',
  )
  return parsePolicySets(response)
}
```

Modify `src/config/apiEndpoints.ts` — add a `policySets` block right after `snapshotPolicies`:

```ts
  snapshotPolicies: {
    list: '/api/get_policies',
    submit: '/api/submit_policy',
    delete: '/api/delete_policy',
  },
  policySets: {
    list: '/api/get_policy_sets',
    submit: '/api/submit_policy_set',
    delete: '/api/delete_policy_set',
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recovery-plans/policy-sets/api --no-coverage`
Expected: PASS (all tests in both files).

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/policy-sets/model/policySetTypes.ts src/features/recovery-plans/policy-sets/api/schemas/policySetsSchema.ts src/features/recovery-plans/policy-sets/api/policySetQueryKeys.ts src/features/recovery-plans/policy-sets/api/policySetsApi.ts src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts src/features/recovery-plans/policy-sets/api/policySetQueryKeys.test.ts src/config/apiEndpoints.ts
git commit -m "feat: add policy sets model, schema, and API client"
```

---

### Task 2: Policy set React Query hooks

**Files:**
- Create: `src/features/recovery-plans/policy-sets/hooks/usePolicySets.ts`
- Create: `src/features/recovery-plans/policy-sets/hooks/useSubmitPolicySet.ts`
- Create: `src/features/recovery-plans/policy-sets/hooks/useDeletePolicySet.ts`
- Test: `src/features/recovery-plans/policy-sets/hooks/policySetHooks.test.tsx`

**Interfaces:**
- Consumes: `fetchPolicySets`, `submitPolicySet`, `deletePolicySet` from `../api/policySetsApi` (Task 1); `policySetKeys` from `../api/policySetQueryKeys` (Task 1).
- Produces: `usePolicySets()` (React Query `useQuery` result over `PolicySet[]`), `useSubmitPolicySet()` and `useDeletePolicySet()` (React Query `useMutation` results that replace the cached list with the authoritative response).

- [ ] **Step 1: Write the failing hook tests**

Create `src/features/recovery-plans/policy-sets/hooks/policySetHooks.test.tsx`:

```tsx
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { policySetKeys } from '../api/policySetQueryKeys'
import type { PolicySet } from '../model/policySetTypes'
import { useDeletePolicySet } from './useDeletePolicySet'
import { usePolicySets } from './usePolicySets'
import { useSubmitPolicySet } from './useSubmitPolicySet'

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  policyIds: ['medium-6h'],
}

const wirePolicySet = {
  id: policySet.id,
  name: policySet.name,
  description: policySet.description,
  policy_ids: policySet.policyIds,
}

function createQueryContext() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function stubPolicySets(policySets: (typeof wirePolicySet)[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ policy_sets: policySets }), { status: 200 }),
  ))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('policy set hooks', () => {
  it('loads policy sets into their isolated cache', async () => {
    stubPolicySets([wirePolicySet])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => usePolicySets(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual([policySet])
    expect(client.getQueryData(policySetKeys.list())).toEqual([policySet])
  })

  it('replaces the cached list with the authoritative submit response', async () => {
    stubPolicySets([wirePolicySet])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useSubmitPolicySet(), { wrapper })
    result.current.mutate(policySet)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(policySetKeys.list())).toEqual([policySet])
  })

  it('replaces the cached list with the authoritative delete response', async () => {
    stubPolicySets([])
    const { client, wrapper } = createQueryContext()
    client.setQueryData(policySetKeys.list(), [policySet])

    const { result } = renderHook(() => useDeletePolicySet(), { wrapper })
    result.current.mutate(policySet.id)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(policySetKeys.list())).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/recovery-plans/policy-sets/hooks --no-coverage`
Expected: FAIL — `./usePolicySets`, `./useSubmitPolicySet`, `./useDeletePolicySet` cannot be found.

- [ ] **Step 3: Write the hooks**

Create `src/features/recovery-plans/policy-sets/hooks/usePolicySets.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchPolicySets } from '../api/policySetsApi'
import { policySetKeys } from '../api/policySetQueryKeys'

export function usePolicySets() {
  return useQuery({
    queryKey: policySetKeys.list(),
    queryFn: fetchPolicySets,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
```

Create `src/features/recovery-plans/policy-sets/hooks/useSubmitPolicySet.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitPolicySet } from '../api/policySetsApi'
import { policySetKeys } from '../api/policySetQueryKeys'

export function useSubmitPolicySet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitPolicySet,
    onSuccess: policySets => queryClient.setQueryData(policySetKeys.list(), policySets),
  })
}
```

Create `src/features/recovery-plans/policy-sets/hooks/useDeletePolicySet.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePolicySet } from '../api/policySetsApi'
import { policySetKeys } from '../api/policySetQueryKeys'

export function useDeletePolicySet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePolicySet,
    onSuccess: policySets => queryClient.setQueryData(policySetKeys.list(), policySets),
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recovery-plans/policy-sets/hooks --no-coverage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/policy-sets/hooks/usePolicySets.ts src/features/recovery-plans/policy-sets/hooks/useSubmitPolicySet.ts src/features/recovery-plans/policy-sets/hooks/useDeletePolicySet.ts src/features/recovery-plans/policy-sets/hooks/policySetHooks.test.tsx
git commit -m "feat: add policy set React Query hooks"
```

---

### Task 3: Locale entries for the policy sets feature

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`
- Modify: `src/locales/cs.json`

**Interfaces:**
- Produces: every translation key consumed by Tasks 4-9 (`nav.recovery.policySets`, `pages.policySets.*`, `policySets.*`, `tables.policySet.*`, `details.policySetId`, `details.policies`, `pages.recoveryGroupBuilder.steps.policySet`, `pages.recoveryGroupBuilder.policySet.*`, `tables.recoveryGroups.policySet`).

This task has no tests of its own (translation strings aren't independently testable); it exists so later component/page tasks can rely on real keys via `mockUseTranslation` (which reads `en.json` directly). Adding all keys up front keeps every later task's tests passing on the first try.

- [ ] **Step 1: Add the English keys**

Edit `src/locales/en.json` — insert after the `"nav.recovery.snapshotPolicies": "Snapshot Policies",` line:

```json
  "nav.recovery.snapshotPolicies": "Snapshot Policies",
  "nav.recovery.policySets": "Policy Sets",
```

Insert after the `"pages.recoveryGroupBuilder.steps.relatedStorage": "Related storage",` line:

```json
  "pages.recoveryGroupBuilder.steps.relatedStorage": "Related storage",
  "pages.recoveryGroupBuilder.steps.policySet": "Policy Set",
```

Insert after the `"pages.recoveryGroupBuilder.validation.idInUse": "This recovery group ID is already in use.",` line:

```json
  "pages.recoveryGroupBuilder.validation.idInUse": "This recovery group ID is already in use.",
  "pages.recoveryGroupBuilder.policySet.title": "Policy set",
  "pages.recoveryGroupBuilder.policySet.description": "Select the policy set that defines the snapshot policies for this recovery group.",
  "pages.recoveryGroupBuilder.policySet.loading": "Loading policy sets",
  "pages.recoveryGroupBuilder.policySet.empty.title": "No policy sets available",
  "pages.recoveryGroupBuilder.policySet.empty.description": "Create a policy set before assigning it to a recovery group.",
  "pages.recoveryGroupBuilder.policySet.policiesCount": "{count} policies",
```

Insert after the `"tables.recoveryGroups.draft": "Draft",` line:

```json
  "tables.recoveryGroups.draft": "Draft",
  "tables.recoveryGroups.policySet": "Policy Set",
```

Insert after the `"pages.snapshotPolicies.inventoryDescription": "Browse and manage snapshot schedules returned by the backend."` line, turning its trailing (no-comma) line into a comma-terminated line followed by the new block ending in the final no-comma line before the closing `}`:

```json
  "pages.snapshotPolicies.inventoryDescription": "Browse and manage snapshot schedules returned by the backend.",
  "policySets.loading": "Loading policy sets",
  "policySets.loadFailed": "Policy sets could not be loaded.",
  "policySets.searchPlaceholder": "Search name, ID or description",
  "policySets.searchLabel": "Search policy sets",
  "policySets.tableLabel": "Policy sets table",
  "policySets.noMatches": "No policy sets match your search.",
  "policySets.empty": "No policy sets were returned by the backend.",
  "policySets.drawer.eyebrow": "Selected policy set",
  "policySets.drawer.label": "Policy set detail",
  "policySets.drawer.close": "Close policy set detail",
  "policySets.delete.title": "Delete policy set",
  "policySets.delete.message": "Delete policy set {name}?",
  "details.policySetId": "Policy set ID",
  "details.policies": "Policies",
  "policySets.form.id": "Policy set ID",
  "policySets.form.name": "Policy set name",
  "policySets.form.description": "Description",
  "policySets.form.policies": "Snapshot policies",
  "policySets.form.noPolicies": "No snapshot policies are available. Create a snapshot policy first.",
  "policySets.modal.createTitle": "Create policy set",
  "policySets.modal.editTitle": "Edit policy set",
  "policySets.submitFailed": "Failed to save policy set",
  "policySets.validation.idRequired": "Policy set ID is required",
  "policySets.validation.idExists": "A policy set with this ID already exists",
  "policySets.validation.nameRequired": "Policy set name is required",
  "policySets.validation.descriptionRequired": "Description is required",
  "policySets.validation.policiesRequired": "Select at least one snapshot policy",
  "policySets.discard.title": "Discard unsaved policy set changes?",
  "policySets.discard.message": "All unsaved policy set changes will be lost.",
  "policySets.discard.stay": "Keep editing",
  "policySets.discard.confirm": "Discard changes",
  "tables.policySet.name": "Name",
  "tables.policySet.description": "Description",
  "tables.policySet.policies": "Policies",
  "pages.policySets.eyebrow": "Recovery Plans",
  "pages.policySets.title": "Policy Sets",
  "pages.policySets.description": "Group snapshot policies into reusable sets that recovery groups can reference.",
  "pages.policySets.addButton": "Add Policy Set",
  "pages.policySets.inventoryTitle": "Policy set records",
  "pages.policySets.inventoryDescription": "Browse and manage policy sets available to recovery groups."
}
```

- [ ] **Step 2: Add the matching Slovak keys**

Edit `src/locales/sk.json` — insert after `"nav.recovery.snapshotPolicies": "Politiky snímok",`:

```json
  "nav.recovery.snapshotPolicies": "Politiky snímok",
  "nav.recovery.policySets": "Sady politík",
```

Insert after the Slovak `"pages.recoveryGroupBuilder.steps.relatedStorage"` line (mirror the English line's position exactly):

```json
  "pages.recoveryGroupBuilder.steps.policySet": "Sada politík",
```

Insert after the Slovak `"pages.recoveryGroupBuilder.validation.idInUse"` line:

```json
  "pages.recoveryGroupBuilder.policySet.title": "Sada politík",
  "pages.recoveryGroupBuilder.policySet.description": "Vyberte sadu politík, ktorá definuje politiky snímok pre túto skupinu obnovy.",
  "pages.recoveryGroupBuilder.policySet.loading": "Načítavajú sa sady politík",
  "pages.recoveryGroupBuilder.policySet.empty.title": "Nie sú k dispozícii žiadne sady politík",
  "pages.recoveryGroupBuilder.policySet.empty.description": "Pred priradením k skupine obnovy vytvorte sadu politík.",
  "pages.recoveryGroupBuilder.policySet.policiesCount": "{count} politík",
```

Insert after the Slovak `"tables.recoveryGroups.draft"` line:

```json
  "tables.recoveryGroups.policySet": "Sada politík",
```

Insert after the Slovak `"pages.snapshotPolicies.inventoryDescription"` line (the last key before the file's closing `}`), turning it into a comma-terminated line:

```json
  "policySets.loading": "Načítavajú sa sady politík",
  "policySets.loadFailed": "Sady politík sa nepodarilo načítať.",
  "policySets.searchPlaceholder": "Hľadať názov, ID alebo popis",
  "policySets.searchLabel": "Hľadať sady politík",
  "policySets.tableLabel": "Tabuľka sád politík",
  "policySets.noMatches": "Vyhľadávaniu nezodpovedajú žiadne sady politík.",
  "policySets.empty": "Backend nevrátil žiadne sady politík.",
  "policySets.drawer.eyebrow": "Vybraná sada politík",
  "policySets.drawer.label": "Detail sady politík",
  "policySets.drawer.close": "Zavrieť detail sady politík",
  "policySets.delete.title": "Odstrániť sadu politík",
  "policySets.delete.message": "Odstrániť sadu politík {name}?",
  "details.policySetId": "ID sady politík",
  "details.policies": "Politiky",
  "policySets.form.id": "ID sady politík",
  "policySets.form.name": "Názov sady politík",
  "policySets.form.description": "Popis",
  "policySets.form.policies": "Politiky snímok",
  "policySets.form.noPolicies": "Nie sú k dispozícii žiadne politiky snímok. Najprv vytvorte politiku snímok.",
  "policySets.modal.createTitle": "Vytvoriť sadu politík",
  "policySets.modal.editTitle": "Upraviť sadu politík",
  "policySets.submitFailed": "Sadu politík sa nepodarilo uložiť",
  "policySets.validation.idRequired": "ID sady politík je povinné",
  "policySets.validation.idExists": "Sada politík s týmto ID už existuje",
  "policySets.validation.nameRequired": "Názov sady politík je povinný",
  "policySets.validation.descriptionRequired": "Popis je povinný",
  "policySets.validation.policiesRequired": "Vyberte aspoň jednu politiku snímok",
  "policySets.discard.title": "Zahodiť neuložené zmeny sady politík?",
  "policySets.discard.message": "Všetky neuložené zmeny sady politík sa stratia.",
  "policySets.discard.stay": "Pokračovať v úpravách",
  "policySets.discard.confirm": "Zahodiť zmeny",
  "tables.policySet.name": "Názov",
  "tables.policySet.description": "Popis",
  "tables.policySet.policies": "Politiky",
  "pages.policySets.eyebrow": "Plány obnovy",
  "pages.policySets.title": "Sady politík",
  "pages.policySets.description": "Zoskupte politiky snímok do opakovane použiteľných sád, na ktoré sa môžu odkazovať skupiny obnovy.",
  "pages.policySets.addButton": "Pridať sadu politík",
  "pages.policySets.inventoryTitle": "Záznamy sád politík",
  "pages.policySets.inventoryDescription": "Prehľad a správa sád politík dostupných pre skupiny obnovy."
}
```

- [ ] **Step 3: Add the matching Czech keys**

Edit `src/locales/cs.json` — insert after `"nav.recovery.snapshotPolicies": "Zásady snímků",`:

```json
  "nav.recovery.snapshotPolicies": "Zásady snímků",
  "nav.recovery.policySets": "Sady zásad",
```

Insert after the Czech `"pages.recoveryGroupBuilder.steps.relatedStorage"` line:

```json
  "pages.recoveryGroupBuilder.steps.policySet": "Sada zásad",
```

Insert after the Czech `"pages.recoveryGroupBuilder.validation.idInUse"` line:

```json
  "pages.recoveryGroupBuilder.policySet.title": "Sada zásad",
  "pages.recoveryGroupBuilder.policySet.description": "Vyberte sadu zásad, která definuje zásady snímků pro tuto skupinu obnovy.",
  "pages.recoveryGroupBuilder.policySet.loading": "Načítají se sady zásad",
  "pages.recoveryGroupBuilder.policySet.empty.title": "Nejsou k dispozici žádné sady zásad",
  "pages.recoveryGroupBuilder.policySet.empty.description": "Před přiřazením ke skupině obnovy vytvořte sadu zásad.",
  "pages.recoveryGroupBuilder.policySet.policiesCount": "{count} zásad",
```

Insert after the Czech `"tables.recoveryGroups.draft"` line:

```json
  "tables.recoveryGroups.policySet": "Sada zásad",
```

Insert after the Czech `"pages.snapshotPolicies.inventoryDescription"` line (the last key before the file's closing `}`), turning it into a comma-terminated line:

```json
  "policySets.loading": "Načítají se sady zásad",
  "policySets.loadFailed": "Sady zásad se nepodařilo načíst.",
  "policySets.searchPlaceholder": "Hledat název, ID nebo popis",
  "policySets.searchLabel": "Hledat sady zásad",
  "policySets.tableLabel": "Tabulka sad zásad",
  "policySets.noMatches": "Vyhledávání neodpovídají žádné sady zásad.",
  "policySets.empty": "Backend nevrátil žádné sady zásad.",
  "policySets.drawer.eyebrow": "Vybraná sada zásad",
  "policySets.drawer.label": "Detail sady zásad",
  "policySets.drawer.close": "Zavřít detail sady zásad",
  "policySets.delete.title": "Odstranit sadu zásad",
  "policySets.delete.message": "Odstranit sadu zásad {name}?",
  "details.policySetId": "ID sady zásad",
  "details.policies": "Zásady",
  "policySets.form.id": "ID sady zásad",
  "policySets.form.name": "Název sady zásad",
  "policySets.form.description": "Popis",
  "policySets.form.policies": "Zásady snímků",
  "policySets.form.noPolicies": "Nejsou k dispozici žádné zásady snímků. Nejprve vytvořte zásadu snímků.",
  "policySets.modal.createTitle": "Vytvořit sadu zásad",
  "policySets.modal.editTitle": "Upravit sadu zásad",
  "policySets.submitFailed": "Sadu zásad se nepodařilo uložit",
  "policySets.validation.idRequired": "ID sady zásad je povinné",
  "policySets.validation.idExists": "Sada zásad s tímto ID již existuje",
  "policySets.validation.nameRequired": "Název sady zásad je povinný",
  "policySets.validation.descriptionRequired": "Popis je povinný",
  "policySets.validation.policiesRequired": "Vyberte alespoň jednu zásadu snímků",
  "policySets.discard.title": "Zahodit neuložené změny sady zásad?",
  "policySets.discard.message": "Všechny neuložené změny sady zásad budou ztraceny.",
  "policySets.discard.stay": "Pokračovat v úpravách",
  "policySets.discard.confirm": "Zahodit změny",
  "tables.policySet.name": "Název",
  "tables.policySet.description": "Popis",
  "tables.policySet.policies": "Zásady",
  "pages.policySets.eyebrow": "Plány obnovy",
  "pages.policySets.title": "Sady zásad",
  "pages.policySets.description": "Seskupte zásady snímků do opakovaně použitelných sad, na které mohou odkazovat skupiny obnovy.",
  "pages.policySets.addButton": "Přidat sadu zásad",
  "pages.policySets.inventoryTitle": "Záznamy sad zásad",
  "pages.policySets.inventoryDescription": "Přehled a správa sad zásad dostupných pro skupiny obnovy."
}
```

- [ ] **Step 4: Verify key parity across all three locale files**

Run:
```bash
node -e "
const en = require('./src/locales/en.json');
const sk = require('./src/locales/sk.json');
const cs = require('./src/locales/cs.json');
const missingSk = Object.keys(en).filter(k => !(k in sk));
const missingCs = Object.keys(en).filter(k => !(k in cs));
const extraSk = Object.keys(sk).filter(k => !(k in en));
const extraCs = Object.keys(cs).filter(k => !(k in en));
console.log('missing in sk:', missingSk);
console.log('missing in cs:', missingCs);
console.log('extra in sk:', extraSk);
console.log('extra in cs:', extraCs);
"
```
Expected: all four arrays print empty (`[]`).

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/sk.json src/locales/cs.json
git commit -m "feat: add locale entries for policy sets"
```

---

### Task 4: Policy set form and modal components

**Files:**
- Create: `src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx`
- Create: `src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx`
- Test: `src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`

**Interfaces:**
- Consumes: `useSubmitPolicySet` (Task 2); `useSnapshotPolicies` from `@/features/recovery-plans/snapshot-policies/hooks/useSnapshotPolicies` (existing); `PolicySet`, `PolicySetSubmitData` (Task 1); shared `Modal`, `ConfirmDialog`, `Button`, `useUnsavedChangesGuard`, `CheckboxField`/`Field`/`Input`/`Textarea` (existing).
- Produces: `PolicySetForm` (props: `data: PolicySetFormData`, `errors`, `availablePolicies: SnapshotPolicy[]`, `isSubmitting`, `idDisabled?`, `onChange`, `onSubmit`), `PolicySetModal` (props: `open`, `onClose`, `existingPolicySets: PolicySet[]`, `policySet?: PolicySet`).

- [ ] **Step 1: Write the failing modal test**

Create `src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetModal } from './PolicySetModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('@/features/recovery-plans/snapshot-policies/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: () => ({
    data: [
      { id: 'medium-6h', name: 'Medium — 6h', description: '', level: 'medium', frequencyValue: 6, frequencyUnit: 'hours', retentionValue: 7, retentionUnit: 'days', maxSnapshots: null, enabled: true },
      { id: 'low-24h', name: 'Low — 24h', description: '', level: 'low', frequencyValue: 24, frequencyUnit: 'hours', retentionValue: 30, retentionUnit: 'days', maxSnapshots: null, enabled: true },
    ],
  }),
}))

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  policyIds: ['medium-6h'],
}

function renderModal(props: Partial<React.ComponentProps<typeof PolicySetModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PolicySetModal open onClose={vi.fn()} existingPolicySets={[]} {...props} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PolicySetModal', () => {
  it('renders the id, name, description and available policy checkboxes', () => {
    renderModal()

    expect(screen.getByLabelText('Policy set ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Policy set name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Medium — 6h (medium-6h)' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Low — 24h (low-24h)' })).toBeInTheDocument()
  })

  it('submits normalized values and updates the shared query cache', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      policy_sets: [{
        id: 'tier3-web',
        name: 'Tier 3 web',
        description: 'Low priority web tier.',
        policy_ids: ['low-24h'],
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'tier3-web' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Tier 3 web' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Low priority web tier.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Low — 24h (low-24h)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({
      id: 'tier3-web',
      name: 'Tier 3 web',
      description: 'Low priority web tier.',
      policy_ids: ['low-24h'],
    }))
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policySet, existingPolicySets: [policySet] })

    expect(screen.getByRole('heading', { name: 'Edit policy set' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy set ID')).toBeDisabled()
    expect(screen.getByLabelText('Policy set name')).toHaveValue('Tier 2 applications')
    expect(screen.getByRole('checkbox', { name: 'Medium — 6h (medium-6h)' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Low — 24h (low-24h)' })).not.toBeChecked()
  })

  it('requires at least one policy before submitting', () => {
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'empty-set' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Empty set' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'No policies yet.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(screen.getByText('Select at least one snapshot policy')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx --no-coverage`
Expected: FAIL — `./PolicySetModal` cannot be found.

- [ ] **Step 3: Write the form and modal components**

Create `src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx`:

```tsx
import type { ChangeEvent, KeyboardEvent } from 'react'
import { CheckboxField, Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { SnapshotPolicy } from '@/features/recovery-plans/snapshot-policies/model/snapshotPolicyTypes'

export interface PolicySetFormData {
  id: string
  name: string
  description: string
  policyIds: string[]
}

interface PolicySetFormProps {
  data: PolicySetFormData
  errors: Partial<Record<keyof PolicySetFormData, string>>
  availablePolicies: SnapshotPolicy[]
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof PolicySetFormData>(field: K, value: PolicySetFormData[K]) => void
  onSubmit: () => void
}

export function PolicySetForm({
  data,
  errors,
  availablePolicies,
  isSubmitting,
  idDisabled = false,
  onChange,
  onSubmit,
}: PolicySetFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const togglePolicy = (policyId: string, checked: boolean) => {
    onChange('policyIds', checked
      ? [...data.policyIds, policyId]
      : data.policyIds.filter(id => id !== policyId))
  }

  return (
    <div className="custom-scrollbar max-h-[min(68vh,640px)] space-y-4 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('policySets.form.id')} htmlFor="policy-set-id">
          <Input id="policy-set-id" value={data.id} disabled={isSubmitting || idDisabled} invalid={Boolean(errors.id)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }} />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>
        <Field label={t('policySets.form.name')} htmlFor="policy-set-name">
          <Input id="policy-set-name" value={data.name} disabled={isSubmitting} invalid={Boolean(errors.name)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }} />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('policySets.form.description')} htmlFor="policy-set-description">
        <Textarea id="policy-set-description" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('policySets.form.policies')}</span>
        {availablePolicies.length === 0 ? (
          <p className="text-xs text-text-muted">{t('policySets.form.noPolicies')}</p>
        ) : (
          <div className="space-y-2">
            {availablePolicies.map(policy => (
              <CheckboxField
                key={policy.id}
                id={`policy-set-policy-${policy.id}`}
                label={`${policy.name} (${policy.id})`}
                checked={data.policyIds.includes(policy.id)}
                disabled={isSubmitting}
                variant="bordered"
                onChange={(event: ChangeEvent<HTMLInputElement>) => { togglePolicy(policy.id, event.target.checked) }}
              />
            ))}
          </div>
        )}
        {errors.policyIds ? <p className="mt-1 text-xs text-red-600">{errors.policyIds}</p> : null}
      </div>
    </div>
  )
}
```

Create `src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSnapshotPolicies } from '@/features/recovery-plans/snapshot-policies/hooks/useSnapshotPolicies'
import { useSubmitPolicySet } from '../hooks/useSubmitPolicySet'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import { PolicySetForm } from './PolicySetForm'
import type { PolicySetFormData } from './PolicySetForm'

interface PolicySetModalProps {
  open: boolean
  onClose: () => void
  existingPolicySets: PolicySet[]
  policySet?: PolicySet
}

const EMPTY_FORM: PolicySetFormData = { id: '', name: '', description: '', policyIds: [] }

function toFormData(policySet: PolicySet): PolicySetFormData {
  return {
    id: policySet.id,
    name: policySet.name,
    description: policySet.description,
    policyIds: [...policySet.policyIds],
  }
}

function initialForm(policySet?: PolicySet) {
  return policySet ? toFormData(policySet) : EMPTY_FORM
}

export function PolicySetModal({ open, onClose, existingPolicySets, policySet }: PolicySetModalProps) {
  const { t } = useTranslation()
  const submitPolicySet = useSubmitPolicySet()
  const { data: availablePolicies = [] } = useSnapshotPolicies()
  const isEdit = Boolean(policySet)
  const [formData, setFormData] = useState<PolicySetFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof PolicySetFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const initial = initialForm(policySet)
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initial)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialForm(policySet))
    setErrors({})
    setErrorMessage('')
  }, [open, policySet])

  const close = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setErrorMessage('')
    onClose()
  }

  const requestClose = () => {
    if (!submitPolicySet.isPending) navigationGuard.requestNavigation(close)
  }

  const handleChange = <K extends keyof PolicySetFormData>(field: K, value: PolicySetFormData[K]) => {
    setFormData(previous => ({ ...previous, [field]: value }))
    if (errors[field]) {
      setErrors(previous => {
        const next = { ...previous }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field]
        return next
      })
    }
    setErrorMessage('')
  }

  const validate = () => {
    const next: Partial<Record<keyof PolicySetFormData, string>> = {}
    if (!formData.id.trim()) next.id = t('policySets.validation.idRequired')
    else if (!isEdit && existingPolicySets.some(entry => entry.id === formData.id.trim())) next.id = t('policySets.validation.idExists')
    if (!formData.name.trim()) next.name = t('policySets.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('policySets.validation.descriptionRequired')
    if (formData.policyIds.length === 0) next.policyIds = t('policySets.validation.policiesRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const record: PolicySetSubmitData = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      policyIds: formData.policyIds,
    }
    submitPolicySet.mutate(record, {
      onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
      onError: (error: unknown) => {
        const detail = error instanceof Error ? error.message : ''
        setErrorMessage(detail ? `${t('policySets.submitFailed')}: ${detail}` : t('policySets.submitFailed'))
      },
    })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        closeOnBackdrop={false}
        size="lg"
        title={t(isEdit ? 'policySets.modal.editTitle' : 'policySets.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={submitPolicySet.isPending} size="sm" variant="outline" className="flex-1">{t('buttons.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitPolicySet.isPending} size="sm" className="flex-1">
              {submitPolicySet.isPending ? t('messages.saving') : t(isEdit ? 'policySets.modal.editTitle' : 'policySets.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {errorMessage ? <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</div> : null}
        <PolicySetForm data={formData} errors={errors} availablePolicies={availablePolicies} isSubmitting={submitPolicySet.isPending} idDisabled={isEdit} onChange={handleChange} onSubmit={handleSubmit} />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('policySets.discard.title')}
        message={t('policySets.discard.message')}
        cancelLabel={t('policySets.discard.stay')}
        confirmLabel={t('policySets.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx --no-coverage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx
git commit -m "feat: add policy set form and modal components"
```

---

### Task 5: Policy set table component

**Files:**
- Create: `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- Test: `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

**Interfaces:**
- Consumes: `useDeletePolicySet` (Task 2); `useSnapshotPolicies` (existing); `PolicySetModal` (Task 4); `PolicySet` (Task 1); shared `DataTable`/`DataTablePagination`/`DataTableRequestState`/`DataTableSkeleton`/`DataTableToolbar`/`DetailDrawer`/`DetailRow`/`useTableState`, `ConfirmDialog`, `Badge`, `Button` (existing).
- Produces: `PolicySetsTable` (props: `policySets: PolicySet[]`, `isLoading`, `error`, `isRetrying`, `onRetry`).

- [ ] **Step 1: Write the failing table test**

Create `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetsTable } from './PolicySetsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeletePolicySet', () => ({
  useDeletePolicySet: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/recovery-plans/snapshot-policies/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: () => ({
    data: [{ id: 'medium-6h', name: 'Medium — 6h' }],
  }),
}))

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  policyIds: ['medium-6h'],
}

describe('PolicySetsTable', () => {
  it('shows the policy set and opens an accessible detail drawer with resolved policy names', async () => {
    render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search policy sets' })).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Tier 2 applications'))
    expect(screen.getByRole('dialog', { name: 'Policy set detail' })).toBeInTheDocument()
    expect(screen.getByText('Medium — 6h')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('keeps table controls available while showing a shared request error', () => {
    render(
      <PolicySetsTable
        policySets={[]}
        isLoading={false}
        error={new Error('private backend details')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('private backend details')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx --no-coverage`
Expected: FAIL — `./PolicySetsTable` cannot be found.

- [ ] **Step 3: Write the table component**

Create `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useSnapshotPolicies } from '@/features/recovery-plans/snapshot-policies/hooks/useSnapshotPolicies'
import { useDeletePolicySet } from '../hooks/useDeletePolicySet'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetModal } from './PolicySetModal'

function getColumns(t: ReturnType<typeof useTranslation>['t']): ColumnDef<PolicySet>[] {
  return [
    {
      id: 'name',
      header: t('tables.policySet.name'),
      cell: policySet => (
        <>
          <span className="block font-semibold text-text-primary">{policySet.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{policySet.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.policySet.description'),
      cell: policySet => <span className="block max-w-md truncate" title={policySet.description}>{policySet.description || '-'}</span>,
    },
    {
      id: 'policies',
      header: t('tables.policySet.policies'),
      align: 'right',
      cell: policySet => String(policySet.policyIds.length),
    },
  ]
}

interface PolicySetsTableProps {
  policySets: PolicySet[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function PolicySetsTable({ policySets, isLoading, error, isRetrying, onRetry }: PolicySetsTableProps) {
  const { t } = useTranslation()
  const deletePolicySet = useDeletePolicySet()
  const { data: availablePolicies = [] } = useSnapshotPolicies()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PolicySet | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PolicySet | null>(null)
  const rows = useMemo(() => policySets, [policySets])
  const selected = rows.find(policySet => policySet.id === selectedId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description'] })
  const policyName = (policyId: string) => availablePolicies.find(policy => policy.id === policyId)?.name ?? policyId

  if (isLoading) {
    return <DataTableSkeleton columnCount={3} ariaLabel={t('policySets.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('policySets.searchPlaceholder')}
        searchLabel={t('policySets.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />

      <DataTableRequestState
        error={error ? {
          title: t('policySets.loadFailed'),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={getColumns(t)}
          rows={table.pageItems}
          rowKey={policySet => policySet.id}
          density={table.density}
          minWidthClassName="min-w-200"
          ariaLabel={t('policySets.tableLabel')}
          rowAriaLabel={policySet => policySet.name}
          onRowClick={policySet => { setSelectedId(policySet.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('policySets.noMatches') : t('policySets.empty')}
        />
      </DataTableRequestState>

      {!error ? (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          total={table.total}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('policySets.drawer.eyebrow')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        ariaLabel={t('policySets.drawer.label')}
        closeLabel={t('policySets.drawer.close')}
        footer={selected ? (
          <>
            <Button onClick={() => { setDeleteTarget(selected) }} size="sm" variant="danger" className="flex-1">{t('buttons.delete')}</Button>
            <Button onClick={() => { setEditing(selected); setSelectedId(null) }} size="sm" className="flex-1">{t('buttons.edit')}</Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('details.policySetId')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('details.description')} value={selected.description || '-'} />
            <DetailRow label={t('details.policies')} value={selected.policyIds.map(policyName).join(', ') || '-'} />
          </dl>
        ) : null}
      </DetailDrawer>

      {editing ? <PolicySetModal open onClose={() => { setEditing(null) }} existingPolicySets={rows} policySet={editing} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('policySets.delete.title')}
        message={t('policySets.delete.message').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deletePolicySet.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deletePolicySet.mutate(deleteTarget.id, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
          })
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx --no-coverage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx
git commit -m "feat: add policy sets table component"
```

---

### Task 6: Policy sets page, route, and navigation

**Files:**
- Create: `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`
- Test: `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx`
- Modify: `src/app/routes.ts`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/layouts/app-shell/AppSidebar.tsx`

**Interfaces:**
- Consumes: `usePolicySets` (Task 2); `PolicySetsTable`, `PolicySetModal` (Tasks 4-5); shared `InventoryShell`, `TableToolbar`, `Button` (existing).
- Produces: `PolicySetsPage`; `routes.policySets`; the `/recovery-plans/policy-sets` route; the "Policy Sets" sidebar nav item.

- [ ] **Step 1: Write the failing page test**

Create `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePolicySets } from '../hooks/usePolicySets'
import { PolicySetsPage } from './PolicySetsPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/usePolicySets', () => ({ usePolicySets: vi.fn() }))
vi.mock('../components/PolicySetsTable', () => ({
  PolicySetsTable: () => <div>Policy set catalogue</div>,
}))
vi.mock('../components/PolicySetModal', () => ({
  PolicySetModal: ({ open, existingPolicySets }: { open: boolean; existingPolicySets: unknown[] }) => (
    open ? <div>Policy set modal with {existingPolicySets.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(usePolicySets).mockReturnValue({
    data: [{ id: 'tier2-apps' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePolicySets>)
})

describe('PolicySetsPage', () => {
  it('renders the shared inventory layout without category tabs', () => {
    render(<PolicySetsPage />)

    expect(screen.getByRole('heading', { name: 'Policy Sets', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Policy set catalogue')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('opens the create modal with cached policy sets', async () => {
    render(<PolicySetsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add Policy Set' }))
    expect(screen.getByText('Policy set modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes policy sets from the page toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(usePolicySets).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof usePolicySets>)
    render(<PolicySetsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx --no-coverage`
Expected: FAIL — `./PolicySetsPage` cannot be found.

- [ ] **Step 3: Write the page, and wire the route and navigation**

Create `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { PolicySetsTable } from '../components/PolicySetsTable'
import { PolicySetModal } from '../components/PolicySetModal'
import { usePolicySets } from '../hooks/usePolicySets'

export function PolicySetsPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policySets = [], isLoading, isFetching, error, refetch } = usePolicySets()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.policySets.eyebrow')}
        title={t('pages.policySets.title')}
        description={t('pages.policySets.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.policySets.addButton')}
          </Button>
        )}
      />

      <div className="flex-1 overflow-hidden p-3 lg:min-h-0">
        <InventoryShell
          inventoryTitle={t('pages.policySets.inventoryTitle')}
          inventoryDescription={t('pages.policySets.inventoryDescription')}
          tabs={null}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:min-h-0">
            <PolicySetsTable
              policySets={policySets}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              onRetry={() => { void refetch() }}
            />
          </div>
        </InventoryShell>
      </div>

      <PolicySetModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingPolicySets={policySets}
      />
    </div>
  )
}
```

Modify `src/app/routes.ts` — add after the `snapshotPolicies` line:

```ts
  snapshotPolicies: '/recovery-plans/snapshot-policies',
  policySets: '/recovery-plans/policy-sets',
```

Modify `src/app/AppRoutes.tsx` — add a lazy import after the `SnapshotPoliciesPage` lazy import:

```ts
const SnapshotPoliciesPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/snapshot-policies/pages/SnapshotPoliciesPage')
  return { default: page.SnapshotPoliciesPage }
})

const PolicySetsPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/policy-sets/pages/PolicySetsPage')
  return { default: page.PolicySetsPage }
})
```

And add a `<Route>` after the `snapshot-policies` route (still inside the `recovery-plans` parent `<Route>`):

```tsx
          <Route
            path="snapshot-policies"
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <SnapshotPoliciesPage />
              </Suspense>
            )}
          />
          <Route
            path="policy-sets"
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <PolicySetsPage />
              </Suspense>
            )}
          />
```

Modify `src/layouts/app-shell/AppSidebar.tsx` — add the nav item after `'Snapshot Policies'` in the `'Recovery Plans'` group's `subItems`:

```ts
      { name: 'Recovery Applications', path: routes.recoveryApplications },
      { name: 'Recovery Groups', path: routes.recoveryGroups },
      { name: 'Snapshot Policies', path: routes.snapshotPolicies },
      { name: 'Policy Sets', path: routes.policySets },
      { name: 'Recovery Runs', path: routes.recoveryRuns },
```

And add the matching `navKeyMap` entry after `'Snapshot Policies'`:

```ts
  'Snapshot Policies': 'nav.recovery.snapshotPolicies',
  'Policy Sets': 'nav.recovery.policySets',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx --no-coverage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/app/routes.ts src/app/AppRoutes.tsx src/layouts/app-shell/AppSidebar.tsx
git commit -m "feat: add policy sets page, route, and navigation"
```

---

### Task 7: RecoveryGroup model, schema, validation, and mapping for policySetId

**Files:**
- Modify: `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts`
- Modify: `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Interfaces:**
- Produces: `RecoveryGroupBase.policySetId: string`, `RecoveryGroupDraft.policySetId: string | null`, `ValidatedRecoveryGroupDraft.policySetId: string`, `recoveryGroupApiSchema` field `policy_set_id`, `RecoveryGroupSubmitPayload.policy_set_id`. These are consumed by Task 8 (builder wizard) and Task 9 (table display).

- [ ] **Step 1: Update the failing/adjusted API tests first**

Edit `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`:

Add `policy_set_id` to the read fixture:

```ts
const databaseGroupPayload = {
  id: 'database_group',
  name: 'Database group',
  description: 'Database tier',
  provider_id_vm: 'vmware-vcenter-01',
  provider_id_volume: 'ibm-flashsystem-01',
  policy_set_id: 'tier2-apps',
  vms: [{ name: 'TEST-DB01' }, { name: 'TEST-DB02' }],
  volumes: [{ name: 'TEST-VOLUME1' }, { name: 'TEST-VOLUME2' }],
}
```

Add `policySetId: 'tier2-apps'` to the exact-match expectation in `fetchRecoveryGroups`'s first test:

```ts
    await expect(fetchRecoveryGroups(providers)).resolves.toEqual([{
      id: 'database_group',
      name: 'Database group',
      description: 'Database tier',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['TEST-DB01', 'TEST-DB02'],
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['TEST-VOLUME1', 'TEST-VOLUME2'],
      resourceCount: 2,
      status: 'Active',
    }])
```

Add `policySetId: 'tier2-apps'` to every `RecoveryGroupDraft` literal passed to `createRecoveryGroup`/`updateRecoveryGroup` in the `submitRecoveryGroup` describe block (the VM/Power `it.each`, the FlashSystem submit test, the update test, the invalid-draft test, and the HTTP-failure test) — for example the first `it.each`:

```ts
    await createRecoveryGroup({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      sourceCategory: 'backup_system_workload',
      workloadType,
      resourceType: 'vm',
      providerId,
      policySetId: 'tier2-apps',
      resources: ['VM-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
    })

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_recovery_group')
    expect(init.method).toBe('POST')
    expect(parseRequestBody(init)).toEqual({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      provider_id_vm: providerId,
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [{ name: 'VM-01' }],
      volumes: [],
    })
```

Apply the same two additions (`policySetId: 'tier2-apps'` on the draft, `policy_set_id: 'tier2-apps'` on the expected request body) to the "submits FlashSystem resources" test, and add `policySetId: 'tier2-apps'` to the drafts in the "preserves related volumes while upserting", "rejects invalid drafts before calling the backend", and "reports an HTTP failure" tests (the last two don't need a `policy_set_id` assertion since they don't inspect the request body or the invalid-draft path never reaches the network call).

- [ ] **Step 2: Run tests to verify they fail on the new field**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts --no-coverage`
Expected: FAIL — TypeScript errors (`policySetId` missing from `RecoveryGroupDraft` literals) and/or assertion mismatches (actual objects lack `policySetId`/`policy_set_id`).

- [ ] **Step 3: Add policySetId to the model, schema, validation, and mapping**

Edit `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts` — add `policySetId` to `RecoveryGroupBase` and to `RecoveryGroupDraft`:

```ts
interface RecoveryGroupBase {
  id: string
  name: string
  description: string
  providerId: string | null
  policySetId: string
  resourceCount: number
  status: RecoveryGroupStatus
}
```

```ts
export interface RecoveryGroupDraft {
  id: string
  name: string
  description: string
  sourceCategory: RecoveryGroupSourceCategory | null
  workloadType: RecoveryGroupWorkloadType | null
  resourceType: RecoveryGroupResourceType | null
  providerId: string | null
  policySetId: string | null
  resources: string[]
  relatedVolumeProviderId?: string | null
  relatedVolumes?: string[]
}
```

Edit `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts`:

```ts
export const recoveryGroupApiSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string(),
  provider_id_vm: z.string(),
  provider_id_volume: z.string(),
  policy_set_id: z.string().trim().min(1),
  vms: z.array(recoveryGroupResourceSchema),
  volumes: z.array(recoveryGroupResourceSchema),
})
```

```ts
export interface RecoveryGroupSubmitPayload {
  id: string
  name: string
  description: string
  provider_id_vm: string
  provider_id_volume: string
  policy_set_id: string
  vms: { name: string }[]
  volumes: { name: string }[]
}
```

Edit `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts`:

```ts
export interface ValidatedRecoveryGroupDraft {
  id: string
  name: string
  description: string
  providerId: string
  policySetId: string
  resources: string[]
  relatedVolumeProviderId: string | null
  relatedVolumes: string[]
  configuration: RecoveryGroupResourceConfiguration
}

export function validateRecoveryGroupDraft(draft: RecoveryGroupDraft): ValidatedRecoveryGroupDraft {
  const name = draft.name.trim()
  const description = draft.description.trim()
  const providerId = draft.providerId?.trim() ?? ''
  const policySetId = draft.policySetId?.trim() ?? ''
  const resources = draft.resources.map(resource => resource.trim())
  const normalizedRelatedVolumeProviderId = draft.relatedVolumeProviderId?.trim() ?? ''
  const relatedVolumeProviderId = normalizedRelatedVolumeProviderId
    ? normalizedRelatedVolumeProviderId
    : null
  const relatedVolumes = (draft.relatedVolumes ?? []).map(resource => resource.trim())
  const configuration = recoveryGroupConfigurationSchema.safeParse({
    sourceCategory: draft.sourceCategory,
    workloadType: draft.workloadType,
    resourceType: draft.resourceType,
  })

  if (
    !draft.id.trim()
    || !name
    || !description
    || !providerId
    || !policySetId
    || resources.length === 0
    || resources.some(resource => !resource)
    || new Set(resources).size !== resources.length
    || relatedVolumes.some(resource => !resource)
    || new Set(relatedVolumes).size !== relatedVolumes.length
    || (relatedVolumes.length > 0 && !relatedVolumeProviderId)
    || !configuration.success
  ) {
    throw new RecoveryGroupsError('invalid_draft', 'Recovery group data is invalid')
  }

  return {
    id: draft.id,
    name,
    description,
    providerId,
    policySetId,
    resources,
    relatedVolumeProviderId,
    relatedVolumes,
    configuration: configuration.data,
  }
}
```

Edit `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts` — add `policySetId: record.policy_set_id,` to both return branches in `mapRecoveryGroupApiRecord`:

```ts
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      providerId: vmProviderId,
      policySetId: record.policy_set_id,
      ...vmConfiguration(provider),
      resources: vmResources,
      relatedVolumeProviderId: volumeProviderId || null,
      relatedVolumes: volumeResources,
      resourceCount: vmResources.length,
      status: vmResources.length > 0 ? 'Active' : 'Draft',
    }
```

```ts
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    providerId: volumeProviderId,
    policySetId: record.policy_set_id,
    sourceCategory: 'storage_system',
    workloadType: 'ibm_flashsystem',
    resourceType: 'volume',
    resources: volumeResources,
    relatedVolumeProviderId: null,
    relatedVolumes: [],
    resourceCount: volumeResources.length,
    status: volumeResources.length > 0 ? 'Active' : 'Draft',
  }
```

Add `policy_set_id: draft.policySetId,` to `toRecoveryGroupSubmitPayload`'s return:

```ts
export function toRecoveryGroupSubmitPayload(
  draft: ValidatedRecoveryGroupDraft,
  id: string,
): RecoveryGroupSubmitPayload {
  const isVmGroup = draft.configuration.resourceType === 'vm'
  return {
    id,
    name: draft.name,
    description: draft.description,
    provider_id_vm: isVmGroup ? draft.providerId : '',
    provider_id_volume: isVmGroup
      ? (draft.relatedVolumeProviderId ?? '')
      : draft.providerId,
    policy_set_id: draft.policySetId,
    vms: isVmGroup ? draft.resources.map(name => ({ name })) : [],
    volumes: isVmGroup
      ? draft.relatedVolumes.map(name => ({ name }))
      : draft.resources.map(name => ({ name })),
  }
}
```

Add `policySetId: draft.policySetId,` to `toRecoveryGroup`'s return:

```ts
export function toRecoveryGroup(
  draft: ValidatedRecoveryGroupDraft,
  id: string,
): RecoveryGroup {
  const isVmGroup = draft.configuration.resourceType === 'vm'

  return {
    id,
    name: draft.name,
    description: draft.description,
    providerId: draft.providerId,
    policySetId: draft.policySetId,
    ...draft.configuration,
    resources: draft.resources,
    relatedVolumeProviderId: isVmGroup ? draft.relatedVolumeProviderId : null,
    relatedVolumes: isVmGroup ? draft.relatedVolumes : [],
    resourceCount: draft.resources.length,
    status: 'Active',
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts --no-coverage`
Expected: PASS.

Run: `npx tsc -b --noEmit` (or `npm run typecheck`) to confirm no other file in the repo still constructs an incomplete `RecoveryGroup`/`RecoveryGroupDraft`/`RecoveryGroupListItem` literal — Task 8 and Task 9 fix the remaining ones; if this step surfaces errors outside `recovery-groups`/`policy-sets`, note them but do not fix here (they belong to Tasks 8-9).
Expected: only errors inside files touched by Tasks 8-9 (RecoveryGroupBuilder, its test, RecoveryGroupsTable, its test, useRecoveryGroups.test.tsx, RecoveryGroupEditorPage.test.tsx).

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts
git commit -m "feat: add required policySetId to the recovery group model, schema, and mapping"
```

---

### Task 8: RecoveryGroupPolicySetStep component

**Files:**
- Create: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`

**Interfaces:**
- Consumes: `PolicySet` type from `@/features/recovery-plans/policy-sets/model/policySetTypes` (Task 1); shared `EmptyState`, `SelectableCard` (existing).
- Produces: `RecoveryGroupPolicySetStep` (props: `policySets: PolicySet[]`, `isLoading: boolean`, `selectedPolicySetId: string | null`, `onSelect: (policySetId: string) => void`). Consumed by Task 9 (`RecoveryGroupBuilder`).

- [ ] **Step 1: Write the failing step test**

Create `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'
import { RecoveryGroupPolicySetStep } from './RecoveryGroupPolicySetStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const policySets: PolicySet[] = [
  {
    id: 'tier2-apps',
    name: 'Tier 2 applications',
    description: 'Policy set using the medium-tier, 6-hour cadence.',
    policyIds: ['medium-6h'],
  },
  {
    id: 'tier3-web',
    name: 'Tier 3 web',
    description: 'Low priority web tier.',
    policyIds: ['low-24h', 'low-48h'],
  },
]

describe('RecoveryGroupPolicySetStep', () => {
  it('renders each policy set and reports a selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId={null}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByRole('button', { name: /Tier 2 applications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tier 3 web/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tier 3 web/i }))
    expect(onSelect).toHaveBeenCalledWith('tier3-web')
  })

  it('marks the selected policy set as pressed', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Tier 2 applications/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Tier 3 web/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an empty state when no policy sets exist', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={[]}
        isLoading={false}
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('No policy sets available')).toBeInTheDocument()
  })

  it('shows a loading state instead of the empty state while fetching', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={[]}
        isLoading
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading policy sets')
    expect(screen.queryByText('No policy sets available')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx --no-coverage`
Expected: FAIL — `./RecoveryGroupPolicySetStep` cannot be found.

- [ ] **Step 3: Write the step component**

Create `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx`:

```tsx
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { useTranslation } from '@/hooks/useTranslation'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'

interface RecoveryGroupPolicySetStepProps {
  policySets: PolicySet[]
  isLoading: boolean
  selectedPolicySetId: string | null
  onSelect: (policySetId: string) => void
}

export function RecoveryGroupPolicySetStep({
  policySets,
  isLoading,
  selectedPolicySetId,
  onSelect,
}: RecoveryGroupPolicySetStepProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryGroupBuilder.policySet.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryGroupBuilder.policySet.description')}</p>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-text-muted" role="status">{t('pages.recoveryGroupBuilder.policySet.loading')}</p>
      ) : policySets.length === 0 ? (
        <div className="mt-5 max-w-4xl">
          <EmptyState
            title={t('pages.recoveryGroupBuilder.policySet.empty.title')}
            description={t('pages.recoveryGroupBuilder.policySet.empty.description')}
          />
        </div>
      ) : (
        <div className="mt-5 grid max-w-4xl gap-3 md:grid-cols-2 xl:grid-cols-3">
          {policySets.map(policySet => (
            <SelectableCard
              key={policySet.id}
              selected={policySet.id === selectedPolicySetId}
              title={policySet.name}
              description={policySet.description}
              meta={t('pages.recoveryGroupBuilder.policySet.policiesCount').replace('{count}', String(policySet.policyIds.length))}
              onClick={() => { onSelect(policySet.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx --no-coverage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx
git commit -m "feat: add recovery group policy set selection step"
```

---

### Task 9: Wire the policy set step into RecoveryGroupBuilder

**Files:**
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Interfaces:**
- Consumes: `usePolicySets` (Task 2), `RecoveryGroupPolicySetStep` (Task 8), `policySetId` on `RecoveryGroupDraft`/`RecoveryGroup` (Task 7).
- Produces: the wizard now has a final "Policy Set" step for both the VM and volume-only flows; `canCreate` requires `draft.policySetId` to be set.

- [ ] **Step 1: Update the builder test to expect the new step first (so it fails)**

Edit `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`:

Add a mock for the policy sets hook, after the existing `useRecoveryGroupResourceInventory` mock:

```ts
vi.mock('@/features/recovery-plans/policy-sets/hooks/usePolicySets', () => ({
  usePolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        policyIds: ['medium-6h'],
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))
```

Add `policySetId: 'tier2-apps'` to both `existingGroup` and `existingStorageGroup` fixtures.

Update the first test to also assert the new step exists:

```ts
  it('uses a dedicated provider step between resource type and resources', () => {
    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resource type' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Provider' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resources' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Policy Set' })).toBeInTheDocument()
  })
```

Update "allows a virtual-machine group to be created without optional related storage" to select a policy set before creating:

```ts
  it('allows a virtual-machine group to be created without optional related storage', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      policySetId: 'tier2-apps',
    }))
  })
```

Update "adds manually selected FlashSystem volumes to a virtual-machine group" the same way, inserting the policy-set step and card click before the final "Create Recovery Group" click:

```ts
  it('adds manually selected FlashSystem volumes to a virtual-machine group', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: /IBM FlashSystem Source/i }))

    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), {
      dataTransfer: { getData: () => 'VOL-01' },
    })
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      policySetId: 'tier2-apps',
    }))
  })
```

Update "keeps a FlashSystem volume group on the four-step flow" — rename it to reflect the now-five-step flow and select the policy set before expecting Create to be enabled:

```ts
  it('keeps a FlashSystem volume group on the five-step flow', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        initialData={existingStorageGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Related storage' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))

    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
  })
```

Update "can clear the optional FlashSystem mapping before saving" the same way:

```ts
  it('can clear the optional FlashSystem mapping before saving', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={{
          ...existingGroup,
          relatedVolumeProviderId: 'ibm-flashsystem-01',
          relatedVolumes: ['VOL-01'],
        }}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: 'Clear related storage' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      policySetId: 'tier2-apps',
    }))
  })
```

Leave "reports unsaved changes when group details change", "locks the resource configuration while editing an existing group", and "requires a matching provider before enabling the resources step" unchanged — none of them reach the Create button or construct a full draft.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx --no-coverage`
Expected: FAIL — no "Policy Set" step button exists yet, and TypeScript errors on `existingGroup`/`existingStorageGroup` missing `policySetId`.

- [ ] **Step 3: Wire the step into RecoveryGroupBuilder**

Edit `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`.

Add imports after the existing `useProviders` import:

```ts
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { usePolicySets } from '@/features/recovery-plans/policy-sets/hooks/usePolicySets'
import { getRecoveryGroupResourceOption } from '../config/recoveryGroupResourceOptions'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupDetailsStep } from './RecoveryGroupDetailsStep'
import { RecoveryGroupPolicySetStep } from './RecoveryGroupPolicySetStep'
import { RecoveryGroupProviderStep } from './RecoveryGroupProviderStep'
```

Add `policySetId: null,` to `INITIAL_DRAFT`:

```ts
const INITIAL_DRAFT: RecoveryGroupDraft = {
  id: '',
  name: '',
  description: '',
  sourceCategory: null,
  workloadType: null,
  resourceType: null,
  providerId: null,
  policySetId: null,
  resources: [],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
}
```

Add `policySetId: initialData.policySetId,` inside the `initialData`-derived draft:

```ts
  const [draft, setDraft] = useState<RecoveryGroupDraft>(() => initialData
    ? {
        id: initialData.id,
        name: initialData.name,
        description: initialData.description,
        sourceCategory: initialData.sourceCategory,
        workloadType: initialData.workloadType,
        resourceType: initialData.resourceType,
        providerId: initialData.providerId,
        policySetId: initialData.policySetId,
        resources: [...initialData.resources],
        relatedVolumeProviderId: initialData.relatedVolumeProviderId ?? null,
        relatedVolumes: [...initialData.relatedVolumes],
      }
    : INITIAL_DRAFT)
```

Add the policy set query and validity flag, right after `providerValid` is computed:

```ts
  const providerValid = Boolean(
    draft.providerId
    && selectedOption
    && providers.some(provider => (
      provider.id === draft.providerId
      && provider.type === selectedOption.providerType
      && provider.credentialStatus === 'ok'
    )),
  )
  const policySetQuery = usePolicySets()
  const policySets = policySetQuery.data ?? []
  const policySetValid = Boolean(draft.policySetId)
  const hasRelatedStorageStep = draft.resourceType === 'vm'
  const lastStep = hasRelatedStorageStep ? 6 : 5
```

Add the "Policy Set" entry to `steps`, always last:

```ts
  const steps = [
    { id: 'details', label: t('pages.recoveryGroupBuilder.steps.details') },
    { id: 'type', label: t('pages.recoveryGroupBuilder.steps.type'), disabled: !detailsValid },
    {
      id: 'provider',
      label: t('pages.recoveryGroupBuilder.steps.provider'),
      disabled: !detailsValid || !typeValid,
    },
    {
      id: 'resources',
      label: t('pages.recoveryGroupBuilder.steps.resources'),
      disabled: !detailsValid || !typeValid || !providerValid,
    },
    ...(hasRelatedStorageStep ? [{
      id: 'related-storage',
      label: t('pages.recoveryGroupBuilder.steps.relatedStorage'),
      disabled: !detailsValid || !typeValid || !providerValid || draft.resources.length === 0,
    }] : []),
    {
      id: 'policy-set',
      label: t('pages.recoveryGroupBuilder.steps.policySet'),
      disabled: !detailsValid || !typeValid || !providerValid || draft.resources.length === 0,
    },
  ]
```

Extend `canCreate` to require a selected policy set:

```ts
  const canCreate = Boolean(
    draft.name.trim()
    && draft.id
    && idAvailable
    && draft.description.trim()
    && draft.sourceCategory
    && draft.workloadType
    && draft.resourceType
    && providerValid
    && draft.resources.length > 0
    && policySetValid,
  )
```

Add the step's render block, right after the existing `step === 5 && hasRelatedStorageStep` block and before the closing `</div>` of the scrollable step content area:

```tsx
            {step === lastStep ? (
              <RecoveryGroupPolicySetStep
                policySets={policySets}
                isLoading={policySetQuery.isLoading}
                selectedPolicySetId={draft.policySetId}
                onSelect={(policySetId) => { updateDraft({ policySetId }) }}
              />
            ) : null}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx --no-coverage`
Expected: PASS (all tests, including the renamed five-step-flow test).

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx
git commit -m "feat: add the policy set step to the recovery group builder wizard"
```

---

### Task 10: Show the attached policy set name, and fix remaining fixtures

**Files:**
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`

**Interfaces:**
- Consumes: `usePolicySets` (Task 2); `policySetId` on `RecoveryGroupListItem`/`RecoveryGroup` (Task 7).
- Produces: the recovery group detail drawer shows the attached policy set's resolved name; all remaining test fixtures compile and pass with the now-required `policySetId` field.

- [ ] **Step 1: Update RecoveryGroupsTable test to expect the resolved policy set name (so it fails)**

Edit `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`:

Add a mock for the policy sets hook, after the `vi.mock('@/hooks/useTranslation', ...)` line:

```ts
vi.mock('@/features/recovery-plans/policy-sets/hooks/usePolicySets', () => ({
  usePolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        policyIds: ['medium-6h'],
      },
    ],
  }),
}))
```

Add `policySetId: 'tier2-apps',` to both entries in the `groups` fixture array.

Add a new test:

```ts
  it('shows the resolved policy set name in the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))

    expect(await screen.findByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
    expect(screen.getByText('Tier 2 applications')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx --no-coverage`
Expected: FAIL — TypeScript error (`groups` literals missing `policySetId`) and the new test can't find "Tier 2 applications" in the drawer.

- [ ] **Step 3: Show the resolved policy set name in the drawer, and fix the remaining fixtures**

Edit `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`.

Add the import and hook call after the existing imports/hooks:

```ts
import { useTranslation } from '@/hooks/useTranslation'
import { usePolicySets } from '@/features/recovery-plans/policy-sets/hooks/usePolicySets'
import type { RecoveryGroupListItem } from '../model/recoveryGroupTypes'
```

```ts
export function RecoveryGroupsTable({
  groups,
  onEdit,
  onDelete,
  error = null,
  isRetrying = false,
  onRetry = () => undefined,
}: RecoveryGroupsTableProps) {
  const { t } = useTranslation()
  const { data: policySets = [] } = usePolicySets()
  const [selectedId, setSelectedId] = useState<string | null>(null)
```

Add a lookup helper near the other `useMemo`s:

```ts
  const policySetName = (policySetId: string) => (
    policySets.find(policySet => policySet.id === policySetId)?.name ?? policySetId
  )
```

Add a `DetailRow` for the policy set in the drawer's `dl`, after the existing `resourceType` row:

```tsx
            <DetailRow
              label={t('tables.recoveryGroups.resourceType')}
              value={t(getResourceTypeLabelKey(selected.resourceType))}
            />
            <DetailRow
              label={t('tables.recoveryGroups.policySet')}
              value={policySetName(selected.policySetId)}
            />
```

Edit `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx` — add `policySetId: 'tier2-apps',` to the `group` fixture, and to the draft object passed to `result.current.create(...)` in the "invalidates and reloads the list after an upsert" test:

```ts
    await act(async () => {
      await result.current.create({
        id: group.id,
        name: group.name,
        description: group.description,
        sourceCategory: group.sourceCategory,
        workloadType: group.workloadType,
        resourceType: group.resourceType,
        providerId: group.providerId,
        policySetId: group.policySetId,
        resources: group.resources,
      })
    })
```

Edit `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx` — add `policySetId: 'tier2-apps',` to the `group` fixture, and to the draft object built inside the mocked `RecoveryGroupBuilder`'s `onCreate` call:

```tsx
      <button
        type="button"
        onClick={() => {
          onCreate({
            id: initialData.id,
            name: 'Updated group',
            description: initialData.description,
            sourceCategory: initialData.sourceCategory,
            workloadType: initialData.workloadType,
            resourceType: initialData.resourceType,
            providerId: initialData.providerId,
            policySetId: initialData.policySetId,
            resources: initialData.resources,
          })
        }}
      >
        Submit edit
      </button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recovery-plans/recovery-groups --no-coverage`
Expected: PASS for every test file under `recovery-groups` (table, hooks, editor page, builder, api).

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx
git commit -m "feat: display the attached policy set name and fix remaining recovery group fixtures"
```

---

### Task 11: Full verification pass

**Files:** none (verification only).

**Interfaces:** none — this task confirms Tasks 1-10 integrate cleanly across the whole project.

- [ ] **Step 1: Run the full lint, typecheck, and test suite**

Run: `npm run build` (this runs `lint && typecheck && test && vite build` per `package.json`)
Expected: `eslint . --max-warnings 0` passes, `tsc -b` passes, all Vitest suites pass, and the Vite production build completes.

- [ ] **Step 2: Fix any cross-cutting issues surfaced by the full run**

If lint/typecheck/tests fail outside the files touched in Tasks 1-10, they are integration gaps this plan missed (e.g. another file constructing a `RecoveryGroupDraft`/`RecoveryGroupListItem` literal not covered above). Fix them in place, following the same patterns established in Tasks 7-10.

- [ ] **Step 3: Manually verify the new UI paths**

Run: `npm run dev`, then in a browser:
- Navigate to Recovery Plans → Policy Sets. Create a policy set (pick at least one snapshot policy), confirm it appears in the table, open its detail drawer, delete it.
- Navigate to Recovery Plans → Recovery Groups → Create Recovery Group. Walk through Details → Resource type → Provider → Resources → (Related storage, if VM) → Policy Set. Confirm "Create Recovery Group" stays disabled until a policy set is selected, then confirm the group is created successfully.
- Open an existing recovery group for editing and confirm its previously-attached policy set is pre-selected on the Policy Set step, and confirm the detail drawer on the Recovery Groups list shows the policy set's name.

- [ ] **Step 4: Commit any fixes from Step 2**

```bash
git add -A
git commit -m "fix: address integration issues found during full verification"
```

(Skip this commit if Step 2 required no changes.)
