# Implementation Plan: Resource Pages — Source-Role Provider Filtering

## Overview

The Resources tab (Discovery & Inventory → Resources) must only ever show VMs/volumes/partitions that belong to a **source**-role provider, never a **target**-role one. The tab bar (`buildResourceSourceTabs.ts`) already enforces this correctly, but the three resource pages (`VmwareResourcesPage`, `FlashSystemResourcesPage`, `IbmPowerResourcesPage`) and the shared data-fetching hook (`useResourceInventoryQueries`) each re-filter providers locally by `type` only, without checking `role`. This creates a leak: when a customer has only a target-role provider of a given type and no source-role one, a page's fallback logic can select that target provider and display its data.

This plan fixes the leak with **one canonical, reusable filter** rather than four separate patches, so the same bug class cannot reappear as new provider types/tabs are added in the future (the codebase is heading toward potentially many more source types).

## Architecture Decisions

- **Single source of truth for "is this a usable source provider for resource display."** Add one helper, `getSourceProvidersByType(providers, type)`, in the existing `src/features/providers-connectors/providers/utils/providerFilters.ts` (where `getEligibleSourceProviders` and `filterByType` already live — same file, same convention, no new module needed).
- **Every call site that currently does `provider.type === X` for resource-page gating switches to the helper.** This includes the 3 page components and the `useResourceInventoryQueries` hook. `buildResourceSourceTabs.ts` is refactored to use the same helper internally too, so there is exactly one implementation of the role check in the codebase, not two.
- **No registry/architecture rewrite.** `RESOURCE_SOURCE_TAB_DEFINITIONS` already maps `resourceTab → providerType`; that's sufficient. We are not restructuring how pages are dispatched — only fixing what "eligible providers for this type" means, everywhere it's computed. This keeps the change small and reviewable while still closing the bug for all current and future tabs that adopt the helper.
- **Why this scales to "tens of tabs":** today, adding a new provider type means adding one entry to `RESOURCE_SOURCE_TAB_DEFINITIONS` and one new page component. With this change, that new page component calls `getSourceProvidersByType(providers, 'NEW_TYPE')` like all the others — there is no second place to remember to add a role check.

## Task List

### Phase 1: Canonical helper + tests

- [ ] Task 1: Add `getSourceProvidersByType` helper and unit tests
- [ ] Task 2: Refactor `buildResourceSourceTabs.ts` to use the helper (dedup, no behavior change)

### Checkpoint: Phase 1
- [ ] `providerFilters.test.ts` passes (new)
- [ ] `buildResourceSourceTabs.test.ts` still passes unmodified (behavior-preserving refactor)

### Phase 2: Apply to data-fetching layer

- [ ] Task 3: Update `useResourceInventoryQueries.ts` to filter `matchingProviders` with the helper
- [ ] Task 4: Update/extend `useResourceInventoryQueries.test.tsx` with a target-only-provider regression case

### Checkpoint: Phase 2
- [ ] Hook tests pass, including new regression case
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

### Phase 3: Apply to the three resource pages

- [ ] Task 5: Update `VmwareResourcesPage.tsx` (`vmwareProviders` computation + fallback `providerId`)
- [ ] Task 6: Update `FlashSystemResourcesPage.tsx` (`sourceProviders` computation)
- [ ] Task 7: Update `IbmPowerResourcesPage.tsx` (`sourceProviders` computation)
- [ ] Task 8: Add a regression test per page (or one shared parametrized test) proving a target-only provider yields the "no provider" empty state, not leaked data

### Checkpoint: Phase 3
- [ ] All three page test suites pass (new tests added where none existed)
- [ ] Manual check: with mocked provider data (one target-only VMware provider, no source), Resources → VMware tab shows the "no provider" empty state

### Checkpoint: Complete
- [ ] Every provider-role filter in the resources feature funnels through `getSourceProvidersByType`
- [ ] No remaining inline `provider.type === X` filters for resource-page gating (grep confirms)
- [ ] Full focused test run green; no full-suite run needed (change is scoped to discovery-inventory/resources + providers utils)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| A page's empty-state/loading logic subtly depends on the old (type-only) count in a way not covered by tests | Medium | Read each page's full gating logic (not just the `providerId` line) before editing; add a regression test for each page, not just the hook |
| `useResourceInventoryQueries` change affects `failures` reporting (which currently lists `matchingProviders` on an unscoped error) | Low | Existing test `reports an aggregate request failure for all providers of the active source` already exercises this path with type-only providers — verify it still passes after adding role filtering (test fixtures have no `role` field, so `role !== 'target'` naturally passes for legacy fixtures) |
| Some existing provider fixtures in tests omit `role` entirely | Low | `role !== 'target'` treats missing `role` as "not target," i.e. as a source — matches current optional-field semantics already used in `buildResourceSourceTabs.ts` and `getEligibleSourceProviders`, so no fixture updates needed |

## Open Questions

None — scope was confirmed with the user: fix only the Resources page provider-filtering leak, applied uniformly to all current tabs (VMware, FlashSystem, IBM Power) via one reusable helper, so future tabs inherit the fix by construction.
