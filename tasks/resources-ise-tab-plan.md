# Implementation Plan: Resources ISE Tab

## Overview

Add a new top-level page, "Resources ISE" (Isolated Secure Environment), sibling to the existing "Resources" page under the "Discovery & Inventory" nav group. It must be visually and structurally identical to Resources (same tabs — VMware / FlashSystem / IBM Power, same tables, filters, metrics, detail panels) but shows **target**-role providers and their resources instead of **source**-role ones.

Rather than duplicating the three resource-page components and the tab-builder, this plan **parameterizes the existing Resources implementation by provider role** and reuses every component as-is. This follows directly from the source-role filtering work just completed (`c90297a`), which centralized "is this provider eligible" logic in `providerFilters.ts` — this plan generalizes that same helper from source-only to role-aware, and threads a `role` prop through the page tree instead of forking it.

## Assumptions (stated explicitly — flag if any is wrong)

1. **Reuse, don't duplicate.** `VmwareResourcesPage`, `FlashSystemResourcesPage`, `IbmPowerResourcesPage` gain a `role: ProviderRole` prop and use it for provider filtering; the same three components render for both Resources and Resources ISE. This is what makes the design "identical 1:1" by construction — it's the same JSX, not a copy.
2. **New route:** `/discovery-inventory/resources-ise`, new sidebar entry "Resources ISE" as a sibling to "Resources" inside the existing "Discovery & Inventory" group (not a new top-level group).
3. **Page-level heading text is new** (e.g. "Resources ISE" / an "Isolated Secure Environment" description) via a new `pages.resourcesIse.*` i18n namespace, but the **sub-page internals reuse the existing `pages.virtualMachines.*` keys** (table columns, filters, tab pill labels like "VMware"/"FlashSystem"/"IBM Power") since those describe the resource type, not source/target semantics — this is what "same design, opposite data" means concretely.
4. **URL state doesn't collide.** `useResourceTabSearchParam` (search params: `resource`, `providerId`, `page`, `pageSize`, filter keys) is reused unmodified by the new page — since it's a different route, the params reset naturally on navigation between Resources and Resources ISE. No hook changes needed.
5. **`useResourceInventoryQueries` gets a `role` parameter defaulting to `'source'`** so the two existing call sites (FlashSystem/IBM Power pages, currently un-role-aware at the call site since the page passes its own filtered list) keep working — the page passes its own `role` prop through explicitly.

If assumption 1 is wrong and you'd rather have fully separate ISE-specific components (e.g. because ISE is expected to diverge from Resources later), say so before Task 5 — that would change Tasks 5-7 into "new file" instead of "edit existing file."

## Architecture Decisions

- **Generalize the provider filter, don't fork it.** Add `getProvidersByTypeAndRole(providers, type, role)` to `providerFilters.ts`. `getSourceProvidersByType` becomes a thin wrapper (`role: 'source'`) — signature and behavior unchanged, existing tests untouched. Add `getTargetProvidersByType` as the target-role wrapper. Note the asymmetry already present in the codebase: a provider with no `role` set counts as **source** (existing behavior, `role !== 'target'`), so the target filter must use strict `role === 'target'`, not `role !== 'source'` — a legacy fixture with no role must not show up in ISE.
- **Generalize the tab builder, don't fork it.** `buildResourceSourceTabs.ts`'s per-type loop becomes a private role-parameterized function; the existing exported `buildResourceSourceTabs(providers, labels)` stays as a thin wrapper for `role: 'source'` (unchanged signature, unchanged tests); add `buildResourceTargetTabs(providers, labels)` as the target-role wrapper.
- **Thread `role` through the page props, don't duplicate pages.** Add `role: ProviderRole` to `SourceResourcesPageProps` (name kept as-is to minimize unrelated churn — it already means "the page for a single resource source/category", not "source-role only"). `ResourcesPage` passes `role="source"`; the new `ResourcesIsePage` passes `role="target"`. Each of the three sub-page components uses the role prop instead of a hardcoded source-only filter call.
- **New page is a near-duplicate of `ResourcesPage.tsx` at the top level only** (~85 lines) — this one file *is* intentionally close to a copy, because it's the composition root that wires role='target' + new heading copy + the target tab builder. Below that root, everything is shared.

## Task List

### Phase 1: Canonical role-aware filters (foundation)

- [ ] Task 1: Generalize `providerFilters.ts` — add `getProvidersByTypeAndRole`, `getTargetProvidersByType`; keep `getSourceProvidersByType` behavior-identical
- [ ] Task 2: Generalize `buildResourceSourceTabs.ts` — extract private role-parameterized builder, add `buildResourceTargetTabs`

### Checkpoint: Phase 1
- [ ] `providerFilters.test.ts` — existing 5 tests still pass, new tests for `getTargetProvidersByType` pass
- [ ] `buildResourceSourceTabs.test.ts` — existing 4 tests still pass unmodified; new test file/cases for `buildResourceTargetTabs`

### Phase 2: Thread role through the data-fetching hook

- [ ] Task 3: Add `role: ProviderRole = 'source'` param to `useResourceInventoryQueries`
- [ ] Task 4: Extend `useResourceInventoryQueries.test.tsx` with a `role: 'target'` case

### Checkpoint: Phase 2
- [ ] Hook tests pass (existing 6 + new target-role case)

### Phase 3: Thread role through the three resource pages

- [ ] Task 5: Add `role` to `SourceResourcesPageProps`; update `VmwareResourcesPage.tsx` to filter by role
- [ ] Task 6: Update `FlashSystemResourcesPage.tsx` to filter by role and pass role to the hook
- [ ] Task 7: Update `IbmPowerResourcesPage.tsx` to filter by role and pass role to the hook

### Checkpoint: Phase 3
- [ ] Existing `ResourcesPage.test.tsx` still passes unmodified (role defaults/threads to 'source', identical behavior)
- [ ] Manual/unit check: role='target' path selects only target-role providers (covered by Task 4's hook test; page-level rendering is exercised end-to-end in Task 9 via `ResourcesIsePage.test.tsx`)

### Phase 4: New page, route, navigation, i18n

- [ ] Task 8: Add i18n keys `pages.resourcesIse.*` (en/sk/cs) and nav key `nav.discovery.resourcesIse`
- [ ] Task 9: Create `ResourcesIsePage.tsx` (mirrors `ResourcesPage.tsx`, role='target', uses `buildResourceTargetTabs`) + test
- [ ] Task 10: Register route `routes.resourcesIse` in `src/app/routes.ts` and `src/app/AppRoutes.tsx`
- [ ] Task 11: Add sidebar entry "Resources ISE" in `AppSidebar.tsx` (`navItems` + `navKeyMap`)

### Checkpoint: Complete
- [ ] Full focused test run (list below) green
- [ ] Manual check: navigate to Resources ISE, confirm VMware/FlashSystem/IBM Power tabs render, and with a mix of source+target providers seeded, Resources shows only source-role data and Resources ISE shows only target-role data
- [ ] `grep -rn "role === 'target'\|role !== 'target'"` in resources/providers-connectors shows exactly the two canonical helpers containing the check — no inline duplicates
- [ ] Commit created per CLAUDE.md verify-and-commit rule

### Full focused verification command (run once, at the end)
```
npm exec vitest run \
  src/features/providers-connectors/providers/utils/providerFilters.test.ts \
  src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts \
  src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx \
  src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx \
  src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Adding a required `role` prop to `SourceResourcesPageProps` breaks the existing `ResourcesPage.test.tsx` mocked props | Medium | Update the test fixture in the same task that adds the field (Task 5); run `ResourcesPage.test.tsx` immediately after |
| `useResourceInventoryQueries`'s default `role: 'source'` silently masks a missed call site that should have passed `'target'` | Medium | Task 6/7 explicitly pass `role` from the page prop, not the default; Task 4's regression test asserts the hook actually excludes source-role providers when `role: 'target'` is passed |
| New route/nav entry duplicates an existing i18n key structure incorrectly (e.g. reusing `nav.discovery.resources` for both) | Low | Task 8 adds a distinct `nav.discovery.resourcesIse` key before Task 11 wires the sidebar entry to it |
| `ResourcesIsePage.tsx` silently drifts from `ResourcesPage.tsx` over time since they're two files | Low (accepted) | This is the one intentional near-duplicate in the plan (see Architecture Decisions) — acceptable because it's a thin composition root; if drift becomes a problem later, both can be collapsed into one `ResourcesPage(role)` component behind two routes, but that's out of scope here |

## Open Questions

- Confirm the exact nav label/page title wording for "Resources ISE" — using the user's literal term "Resources ISE" for the nav entry, and considering a fuller "Isolated Secure Environment" phrase for the page description only. Confirm before Task 8 if different wording is wanted.
- Confirm whether `role` should be a required or optional prop on `SourceResourcesPageProps` — plan assumes **required** (no silent default at the page-prop level) so a future third role value (if ever added) can't accidentally fall through; the hook-level default in Task 3 is a separate, narrower convenience for the two current call sites.
