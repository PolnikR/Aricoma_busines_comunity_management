# VMware Provider Transition Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make VMware provider switching immediate and visually consistent while retaining the 300 ms debounce for search typing within one provider.

**Architecture:** Scope the debounced name prefix to `providerId` inside `useVmwareResourceInventory`. A provider transition uses the destination prefix immediately; only a prefix edit within the same provider is delayed. Existing TanStack Query keys, provider-safe placeholder behavior, and page loading components remain responsible for cache reuse, data isolation, and visual feedback.

**Tech Stack:** React 19, TypeScript 6, TanStack Query 5, Vitest 4, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-21-vmware-provider-transition-loading-design.md`

## Global Constraints

- Do not add dependencies or change the 300 ms debounce duration.
- Never expose one provider's inventory under another provider's selected tab.
- Apply provider-configured filters immediately on a provider change.
- Preserve existing URL, provider-filter session, pagination, and page layout behavior.
- Keep the change limited to the VMware inventory hook and its focused test unless the failing regression proves another file is required.

---

## File structure

- Modify `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`: own provider-scoped debounce state and select the effective prefix.
- Modify `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`: reproduce both provider-switch directions, cache reuse, data isolation, and same-provider debounce.

### Task 1: Scope the name-prefix debounce to the active provider

**Files:**
- Modify: `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts:41-82`
- Test: `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Interfaces:**
- Consumes: `useVmwareResourceInventory(options: VmwareResourceInventoryOptions)` and `discoveryInventoryKeys.vmwareSearch(search)`.
- Produces: the existing hook return contract with unchanged field names; provider changes use an immediate effective prefix while same-provider prefix edits remain debounced.

- [x] **Step 1: Add the failing provider-transition regression test**

Add one focused test using a real `QueryClient`, a stubbed `fetch`, and controllable responses. Exercise `vm-01` with `TEST-`/`WEB`, uncached `vm-03` without a prefix, then cached `vm-01` again. Include these assertions at the transition boundaries:

```ts
expect(result.current.data).toBeUndefined()
expect(result.current.isInitialLoading).toBe(true)
expect(fetchMock).toHaveBeenLastCalledWith(
  '/api/vms/search?provider_id=vm-03',
  expect.objectContaining({ method: 'POST', body: '{}' }),
)

rerender({ providerId: 'vm-01', namePrefix: 'TEST-', tag: 'WEB' })

expect(result.current.data?.virtualMachines[0]?.name).toBe('VM 01')
expect(fetchMock).toHaveBeenCalledTimes(requestCountBeforeCachedReturn)
```

After the cached return, change only `namePrefix` on `vm-01`. Assert that `isDebouncing` is `true`, the request count is unchanged at 299 ms, and increases once at 300 ms.

- [x] **Step 2: Run the regression test and verify the current behavior fails**

Run:

```powershell
npm.cmd exec -- vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx -t "switches provider filters immediately"
```

Expected: FAIL before implementation because returning from the unprefixed provider to prefixed `vm-01` enters debounce with no data and `isInitialLoading === false`, or because the destination provider request is delayed.

- [x] **Step 3: Introduce provider-scoped debounce state**

Replace the scalar debounce state with an explicit provider/value pair. Keep the initial value empty so the existing first-search debounce remains intact:

```ts
interface DebouncedNamePrefixState {
  providerId: string | undefined
  value: string
}

const currentProviderId = normalizedSearch.providerId
const currentNamePrefix = normalizedSearch.namePrefix ?? ''
const [debouncedNamePrefixState, setDebouncedNamePrefixState] = useState<DebouncedNamePrefixState>(() => ({
  providerId: currentProviderId,
  value: '',
}))
const providerChanged = debouncedNamePrefixState.providerId !== currentProviderId
const effectiveNamePrefix = providerChanged ? currentNamePrefix : debouncedNamePrefixState.value
```

Update the effect so a provider change synchronizes `{ providerId, value }` on the next timer turn, while a same-provider prefix change retains `NAME_SEARCH_DEBOUNCE_MS`. The query still uses `effectiveNamePrefix` immediately during that synchronization turn:

```ts
useEffect(() => {
  const delay = providerChanged || !hasNamePrefix ? 0 : NAME_SEARCH_DEBOUNCE_MS
  const timeout = setTimeout(() => {
    setDebouncedNamePrefixState({ providerId: currentProviderId, value: currentNamePrefix })
  }, delay)

  return () => { clearTimeout(timeout) }
}, [currentNamePrefix, currentProviderId, hasNamePrefix, providerChanged])
```

Build `search` from `effectiveNamePrefix`, and define same-provider debounce without classifying a provider switch as typed input:

```ts
const isDebouncing = !providerChanged
  && hasNamePrefix
  && debouncedNamePrefixState.value !== currentNamePrefix
```

Set `canFetch` from `enabled`, `currentProviderId`, and `!isDebouncing`. Do not weaken the existing `placeholderData` provider check.

- [x] **Step 4: Run the focused regression test and full hook test file**

Run:

```powershell
npm.cmd exec -- vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx -t "switches provider filters immediately"
npm.cmd exec -- vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
```

Expected: the regression test passes; then all tests in the hook test file pass with zero failures.

- [x] **Step 5: Run focused static verification**

Run:

```powershell
npm.cmd exec -- eslint src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
git diff --check
```

Expected: both commands exit with code 0 and emit no lint or whitespace errors. The complete suite and production build are not required because the change is isolated to one hook contract covered by its focused test file.

- [x] **Step 6: Review scope and commit the fix**

Confirm that only the hook and its test changed, no debug instrumentation remains, and no unrelated formatting is present. Then run:

```powershell
git add src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
git diff --staged
git commit -m "fix: make VMware provider transitions consistent"
```

Expected: one atomic commit explaining that provider changes bypass search debounce while same-provider typing remains delayed.
