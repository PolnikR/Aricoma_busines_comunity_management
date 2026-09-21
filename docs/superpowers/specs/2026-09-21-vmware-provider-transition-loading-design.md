# Spec: Consistent VMware Provider Transitions

## Objective

Make switching between VMware providers visually and behaviorally consistent in the Resources inventory. A provider change must apply that provider's configured filters immediately, reuse matching cached inventory when available, and show the existing loading skeleton only while a real uncached request is pending.

The current defect occurs when switching from an unprefixed provider to a provider with a configured `vmPrefix`. The prefix enters the same 300 ms debounce path as typed search input, temporarily producing `data === undefined`, `isDebouncing === true`, and `isInitialLoading === false`. `VmwareResourcesPage` consequently renders no metrics and an empty inventory panel instead of a loading surface.

## User-visible behavior

| Scenario | Required behavior |
|---|---|
| Switch to a provider whose exact inventory query is cached | Show the cached provider inventory immediately, without a skeleton or blank intermediate layout. |
| Switch to an uncached provider | Apply its provider defaults immediately and show the existing metrics/table loading skeleton until the request settles. |
| Switch between providers with different `vmPrefix` values | Do not wait for the search debounce before starting the destination provider query. |
| Type in the VMware search field on the active provider | Retain the 300 ms debounce and keep safe same-provider placeholder data visible where available. |
| Any provider switch | Never display inventory rows from the previously selected provider under the newly selected provider tab. |

## Technical approach

Scope the debounced name prefix to the active `providerId` inside `useVmwareResourceInventory`.

- Initialize the scoped debounce state with the current provider and an empty prefix so initial and same-provider search input retains the existing 300 ms debounce.
- When `providerId` changes, use the destination provider's normalized prefix immediately for the query key and request. Synchronize the stored debounce state to the new provider without applying the 300 ms delay.
- When only `namePrefix` changes for the same provider, continue using the current 300 ms debounce.
- Preserve the existing provider-aware `placeholderData` guard so data cannot leak between providers.
- Keep `VmwareResourcesPage` loading rendering unchanged: an uncached immediate query naturally reports `isInitialLoading`, while a cached query supplies data immediately.

This fix belongs in the inventory hook rather than the page or CSS. The hook owns query timing and is the first layer capable of distinguishing a provider transition from same-provider search typing.

## Tech stack

- React 19 hooks
- TanStack Query 5
- TypeScript 6
- Vitest 4 and Testing Library

No dependency changes are permitted.

## Commands

- Focused test: `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- Focused lint: `npm.cmd exec -- eslint src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- Diff validation: `git diff --check`

## Project structure

- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts` owns VMware query timing, cache keys, loading semantics, and provider-safe placeholder data.
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx` contains the regression coverage for provider transitions and same-provider debounce behavior.
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx` consumes the hook state; no change is expected.

## Code style

Model the debounce state explicitly instead of introducing a page-level workaround:

```ts
interface DebouncedNamePrefixState {
  providerId: string | undefined
  value: string
}
```

Use normalized values for comparisons and query construction. Preserve the existing naming, object-spread conventions, and hook return contract.

## Testing strategy

Add a hook-level regression test that exercises the real TanStack Query cache and both transition directions:

1. Load `vm-01` with prefix `TEST-` and tag `WEB`.
2. Switch to uncached `vm-03` without a prefix and verify its request starts immediately, old provider data is absent, and initial loading is reported.
3. Let `vm-03` settle, then switch back to `vm-01` and verify its exact cached result appears immediately without another request.
4. Change the search prefix while remaining on `vm-01` and verify no request is made before 300 ms and one request is made after 300 ms.

Run only the affected hook test file and focused ESLint command. The complete test suite and production build are outside this change's required verification scope.

## Boundaries

- Always: keep query keys provider-scoped; prevent cross-provider placeholder data; preserve the 300 ms debounce for same-provider typing; use the existing loading skeleton for uncached requests.
- Ask first: changing the debounce duration, altering provider filter persistence, changing URL parameter behavior, or modifying the visual skeleton.
- Never: show stale rows from another provider, add a dependency, use a timeout in `ResourcesPage`, or solve the defect with CSS-only behavior.

## Success criteria

- Provider-configured prefixes are applied immediately when the selected provider changes.
- Returning to an exact cached provider query renders its inventory immediately and performs no additional request.
- Switching to an uncached provider renders the existing loading state until its request settles.
- Same-provider search typing remains debounced by exactly 300 ms.
- No transient state combines `data === undefined`, a provider transition in progress, and `isInitialLoading === false`.
- Focused tests and lint pass, and `git diff --check` reports no errors.

## Non-goals

- Redesigning the Resources page, tabs, metrics, table, or skeleton.
- Changing provider configuration or backend APIs.
- Sharing cached inventory between different providers.
- Changing filtering, pagination, URL, or session-storage semantics.

## Open questions

None. The desired transition behavior was approved on 2026-09-21.
