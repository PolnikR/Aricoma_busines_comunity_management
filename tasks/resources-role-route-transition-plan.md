# Implementation Plan: Smooth Resources Role Route Transition

## Overview

Keep `Resources` and `Resources ISE` as two independent entries in `AppSidebar`, while serving both through one parameterized route and one mounted resource page. `source` and `target` remain distinct provider scopes with independent saved filters. The change removes the current route-level and `key`-driven remounts that make switching between the two entries visibly jump, without creating a duplicate ISE feature.

## Current State and Root Cause

- `/discovery-inventory/resources` renders `ResourcesPage`, while `/discovery-inventory/resources-ise` renders `ResourcesIsePage`.
- Both wrappers delegate to `ResourceRolePage`, but changing between different route elements replaces the page subtree.
- `ResourceRolePage` keys each resource-type page by `effectiveActiveTab.value`; source and target providers have different values, so switching role forces another remount.
- Sidebar navigation drops resource query parameters. Provider selection and VMware filter scope are then initialized by effects, which can add intermediate renders and URL replacements.
- Inventory query keys already include provider identity, and filter-session keys already include `role`; source and target data therefore remain correctly isolated and can safely share the same feature implementation.

## Architecture Decisions

- Preserve two sidebar entries and two user-facing destinations.
- Introduce canonical URLs handled by one route identity:
  - `/discovery-inventory/resources/source`
  - `/discovery-inventory/resources/target`
- Keep backward-compatible redirects:
  - `/discovery-inventory/resources` redirects to the source URL.
  - `/discovery-inventory/resources-ise` redirects to the target URL.
- A route adapter validates `:role` and renders `ResourceRolePage` with `source` or `target`. Invalid role values redirect to source.
- Remove `key={effectiveActiveTab.value}` from same-type resource pages. Switching between VMware providers or roles should update props and TanStack Query observers rather than destroy the component tree.
- Replace any state reset previously supplied implicitly by remounting with explicit provider-sensitive cleanup. Drawer selection must close when its selected record is no longer present after a provider/role change; display preferences such as density may remain stable.
- Keep role-scoped filter snapshots and provider-specific query keys unchanged. Do not merge source and target caches or filters.
- Do not create a new `resources-ise` feature directory or duplicate resource tables, hooks, or API clients.

## Dependency Graph

```text
Canonical route contract and role validation
    -> Sidebar links target canonical source/target URLs
        -> Stable ResourceRolePage identity across role changes
            -> Remove child key remounts
                -> Add explicit stale-selection cleanup
                    -> Verify cache/loading behavior and visual transition
```

## Task List

### Phase 1: Stable route identity

- [ ] Task 1: Add the parameterized resource-role route and compatibility redirects.
- [ ] Task 2: Point both sidebar entries at the canonical role URLs.

### Checkpoint: Routing

- [ ] Both sidebar entries remain visible and independently highlighted.
- [ ] Old bookmarks redirect to the corresponding canonical destination.
- [ ] Invalid `:role` values cannot render an incorrectly scoped inventory.

### Phase 2: Preserve the mounted resource view

- [ ] Task 3: Remove provider-key remounting and explicitly clear stale detail selections.
- [ ] Task 4: Preserve useful cached inventory during provider/role transitions.

### Checkpoint: Transition behavior

- [ ] Switching Resources ↔ Resources ISE does not recreate the shared route page.
- [ ] Source and target filters remain independent.
- [ ] A drawer cannot display a record from the previously selected provider or role.

### Phase 3: Regression and browser verification

- [ ] Task 5: Run the focused route, sidebar, resource-page, query, and browser checks.

### Checkpoint: Complete

- [ ] All acceptance criteria pass.
- [ ] No unrelated navigation or resource behavior changed.
- [ ] Changes are committed in focused atomic commits.

## Detailed Tasks

### Task 1: Parameterize the Resources role route

**Description:** Add one route adapter that reads and validates `:role`, then renders `ResourceRolePage`. Register a single canonical route for both roles and redirects for the two legacy URLs.

**Acceptance criteria:**
- [ ] Both canonical URLs render the correct role through the same route component type.
- [ ] Legacy `/resources` and `/resources-ise` URLs redirect with `replace` to source and target respectively.
- [ ] An unsupported role redirects to source and never falls through as target.

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/app/router.test.tsx src/features/discovery-inventory/resources/pages/ResourceRoleRoutePage.test.tsx`
- [ ] Typecheck passes: `npm run typecheck`

**Dependencies:** None

**Files likely touched:**
- `src/app/routes.ts`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourceRoleRoutePage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourceRoleRoutePage.test.tsx`

**Estimated scope:** Medium: 5 files

### Task 2: Retain two independent sidebar entries

**Description:** Update the existing `Resources` and `Resources ISE` navigation entries to use the canonical source and target URLs. Do not combine or rename the entries.

**Acceptance criteria:**
- [ ] `Resources` links to `/discovery-inventory/resources/source`.
- [ ] `Resources ISE` links to `/discovery-inventory/resources/target`.
- [ ] Only the matching entry is active for each role URL.

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/layouts/app-shell/AppSidebar.test.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/layouts/app-shell/AppSidebar.tsx`
- `src/layouts/app-shell/AppSidebar.test.tsx`

**Estimated scope:** Small: 2 files

### Task 3: Replace implicit remount resets with explicit state cleanup

**Description:** Remove `key={effectiveActiveTab.value}` from the resource-type page dispatch. When the same resource type changes provider or role, retain the component and explicitly close detail UI whose selected record is absent from the new dataset.

**Acceptance criteria:**
- [ ] Same-type provider/role changes do not remount the VMware, FlashSystem, or IBM Power page solely because the provider ID changed.
- [ ] VMware, FlashSystem, and IBM Power detail drawers close when their selected record is not present in the new provider dataset.
- [ ] Switching the resource type still naturally mounts the correct distinct component.

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/pages/ResourceRolePage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.tsx`
- Focused tests beside these components

**Estimated scope:** Medium: implementation in 4 files plus focused test updates

### Task 4: Verify and preserve transition cache behavior

**Description:** Add regression coverage for switching provider identity on an already mounted inventory observer. Preserve prior useful data while the next provider query resolves where TanStack Query supports it, but never label source data as target data or retain a stale selection.

**Acceptance criteria:**
- [ ] Provider identity remains part of every inventory query key.
- [ ] A pending provider transition does not collapse the whole shared page shell.
- [ ] Cached target data is reused when returning to Resources ISE; source and target payloads are never stored under the same key.

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- `src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`
- Inventory hook implementation only if the tests expose a real cache-transition defect

**Estimated scope:** Small to medium: 2-4 files

### Task 5: Focused regression and real-browser transition check

**Description:** Validate routing, active navigation, resource scoping, loading states, URL changes, network requests, and visible layout stability. This task is verification-only unless it exposes a defect directly caused by Tasks 1-4.

**Acceptance criteria:**
- [ ] Resources always shows source-role providers and Resources ISE always shows target-role providers.
- [ ] Repeated switching does not produce console errors, duplicate requests, stale drawers, or a full-page skeleton when cached data exists.
- [ ] Sidebar remains mounted, both entries remain separate, and the inventory shell does not visibly collapse between role transitions.

**Verification:**
- [ ] Tests pass: focused files from Tasks 1-4 in one Vitest invocation.
- [ ] Focused ESLint passes for touched TypeScript files.
- [ ] Typecheck passes: `npm run typecheck`.
- [ ] Validation passes: `git diff --check`.
- [ ] Manual browser check at desktop and narrow viewport: switch Resources ↔ Resources ISE repeatedly and inspect console/network behavior.

**Dependencies:** Tasks 1-4

**Files likely touched:**
- No production files expected
- Existing focused tests only if a missing assertion is discovered

**Estimated scope:** Small

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Canonical URL change breaks bookmarks or external links | Medium | Keep explicit `replace` redirects from both current URLs and test them |
| Removing `key` preserves stale drawer state | High | Add explicit selection validity effects before removing the key and cover every resource type |
| `keepPreviousData` briefly shows source rows under target heading | High | Keep provider in query keys, distinguish placeholder/loading state, and test role transitions with different fixtures |
| Param route accidentally accepts other Discovery & Inventory pages | Medium | Scope it under `/resources/:role`, validate the role enum, and retain explicit sibling routes |
| Filter query parameters leak between roles | Medium | Continue using role-scoped session keys and verify distinct snapshots for source and target |

## Open Questions

None. The product requirement is explicit: two sidebar entries remain; only the internal route and render lifecycle are consolidated.

## Out of Scope

- Creating a separate Resources ISE feature implementation.
- Changing backend provider-role contracts or inventory endpoints.
- Combining source and target filters, providers, or query caches.
- Redesigning resource tables, metrics, or detail drawers.
- Adding animations to hide loading behavior instead of correcting the lifecycle.
