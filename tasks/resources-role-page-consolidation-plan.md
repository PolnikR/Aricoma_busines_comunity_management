# Implementation Plan: Resources / Resources ISE Page Consolidation

## Overview

`ResourcesPage.tsx` (source-role resources, sidebar entry "Resources") and `ResourcesIsePage.tsx` (target-role resources, sidebar entry "Resources ISE") are two independent routes and sidebar tabs — that stays unchanged. Underneath, though, the two page components are structurally identical: same imports, same tab-building logic, same effect syncing the URL search param, same switch over `resourceTab`, differing only in which role-specific tab builder they call and one `role` literal passed to the shared sub-pages. This plan collapses the duplicated body into one internal, role-parameterized component that both page files delegate to, and makes the page copy (currently the unused `pages.resourcesIse.*` locale keys) actually distinguish the target-role view from the source-role one.

## Root Cause / Current State

- `ResourcesPage.tsx` and `ResourcesIsePage.tsx` are ~85 lines each and differ only in: which of `buildResourceSourceTabs`/`buildResourceTargetTabs` is imported and called, and the literal `role: 'source'` vs `role: 'target'` passed down.
- `buildResourceSourceTabs`/`buildResourceTargetTabs` (in `buildResourceSourceTabs.ts`) are both thin wrappers around an unexported `buildResourceTabsByRole(providers, labels, role)`.
- The three resource-type sub-pages (`FlashSystemResourcesPage.tsx`, `IbmPowerResourcesPage.tsx`, `VmwareResourcesPage.tsx`) already receive `role` via `SourceResourcesPageProps` and already filter providers correctly by role (verified in review — no change needed there). Each one hardcodes `eyebrow={t('pages.virtualMachines.eyebrow')}` regardless of role.
- `pages.resourcesIse.{eyebrow,title,description}` exist in `en.json`/`cs.json`/`sk.json` but are never read anywhere in the code — and today their `eyebrow` value is byte-identical to `pages.virtualMachines.eyebrow` in every locale, so even if wired up it wouldn't visually distinguish the two pages.

## Architecture Decisions

- **Keep two routes, two sidebar entries, two exported page components.** `routes.resources` / `routes.resourcesIse` and their `AppRoutes.tsx`/`AppSidebar.tsx` entries are untouched.
- **Introduce one internal `ResourceRolePage({ role })` component** (new file, e.g. `src/features/discovery-inventory/resources/pages/ResourceRolePage.tsx`) containing the body currently duplicated between the two page files: the `useProviders` call, tab building, the URL-sync effect, the `Tabs` render, and the `switch (resourceTab)` dispatch to the three resource-type sub-pages.
- `ResourcesPage.tsx` becomes `export function ResourcesPage() { return <ResourceRolePage role="source" /> }`; `ResourcesIsePage.tsx` becomes the `role="target"` equivalent. Both keep their existing file names and export names since routes import them by name.
- Export `buildResourceTabsByRole` directly from `buildResourceSourceTabs.ts` and call it with the dynamic `role` prop inside `ResourceRolePage`, instead of branching between `buildResourceSourceTabs`/`buildResourceTargetTabs`. The two convenience wrappers stay exported (they now delegate to the same function) since `buildResourceSourceTabs.test.ts` exercises them directly and other code may still reference them.
- **Make the eyebrow role-aware** in the three resource-type sub-pages: `t(role === 'target' ? 'pages.resourcesIse.eyebrow' : 'pages.virtualMachines.eyebrow')`. Title and description stay resource-type-specific (`resources.flash.title`, etc.) — unchanged for both roles, since those already correctly name the resource type (e.g. "FlashSystem Volumes") and aren't the source of confusion.
- **Update the `pages.resourcesIse.eyebrow` copy** in `en.json`/`cs.json`/`sk.json` so it no longer duplicates `pages.virtualMachines.eyebrow` verbatim — it should read as clearly target/ISE-scoped (e.g. English: "Discovery & Inventory · Target" or similar; equivalent adjustments in Czech/Slovak following the existing translation style for `nav.discovery.resourcesIse`, which already reads "Zdroje ISE" / "Zdroje ISE").
- No change to `useResourceInventoryQueries`, `providerFilters.ts` filtering logic, or the resource-type sub-pages' data fetching — the review already confirmed the role-based provider filtering is correct.

## Dependency Graph

```text
Export buildResourceTabsByRole
    -> ResourceRolePage(role) built from the current duplicated body
        -> ResourcesPage / ResourcesIsePage become 1-line wrappers
            -> sub-pages read a role-aware eyebrow key
                -> locale copy updated so the eyebrow actually differs by role
```

## Task 1: Export the shared tab-builder and add a regression test

**Description:** Export `buildResourceTabsByRole` from `buildResourceSourceTabs.ts` (rename export or add a named export alongside the existing wrappers) so it can be called with a dynamic role. No behavior change — `buildResourceSourceTabs`/`buildResourceTargetTabs` keep delegating to it.

**Acceptance criteria:**
- [ ] `buildResourceTabsByRole` is exported and callable with `role: ProviderRole` directly.
- [ ] Existing `buildResourceSourceTabs`/`buildResourceTargetTabs` tests still pass unchanged.

**Verification:**
- [ ] `npm run test -- src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts --run`

**Dependencies:** None

**Files likely touched:**
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`

**Estimated scope:** Small: 1 file

## Task 2: Extract `ResourceRolePage` and slim down the two page files

**Description:** Move the duplicated body from `ResourcesPage.tsx`/`ResourcesIsePage.tsx` into a new `ResourceRolePage({ role })` component; both page files become one-line wrappers passing their fixed role.

**Acceptance criteria:**
- [ ] `ResourcesPage()` renders `<ResourceRolePage role="source" />`; `ResourcesIsePage()` renders `<ResourceRolePage role="target" />`.
- [ ] Tab building, the URL-sync effect, and the `switch (resourceTab)` dispatch exist in exactly one place (`ResourceRolePage`).
- [ ] Existing routes (`/discovery-inventory/resources`, `/discovery-inventory/resources-ise`) and sidebar entries continue to render the correct role's data with no visible regression.
- [ ] Any existing tests that import `ResourcesPage`/`ResourcesIsePage` directly still pass without modification (behavior is unchanged, only the implementation is shared).

**Verification:**
- [ ] `npm run test -- src/features/discovery-inventory/resources --run`
- [ ] `npm exec eslint -- src/features/discovery-inventory/resources/pages/ResourcesPage.tsx src/features/discovery-inventory/resources/pages/ResourcesIsePage.tsx src/features/discovery-inventory/resources/pages/ResourceRolePage.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/pages/ResourceRolePage.tsx` (new)
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.tsx`

**Estimated scope:** Medium: 3 files

## Task 3: Role-aware eyebrow copy across the three resource-type sub-pages

**Description:** Update `FlashSystemResourcesPage.tsx`, `IbmPowerResourcesPage.tsx`, and `VmwareResourcesPage.tsx` to select the eyebrow translation key based on `role`, and update the `pages.resourcesIse.eyebrow` value in all three locale files so it's visually distinct from `pages.virtualMachines.eyebrow`.

**Acceptance criteria:**
- [ ] All three resource-type sub-pages pass `t(role === 'target' ? 'pages.resourcesIse.eyebrow' : 'pages.virtualMachines.eyebrow')` as the `TableToolbar` eyebrow.
- [ ] `pages.resourcesIse.eyebrow` reads differently from `pages.virtualMachines.eyebrow` in `en.json`, `cs.json`, and `sk.json`.
- [ ] Title and description props are unchanged (still resource-type-specific, same for both roles).
- [ ] Visiting `/discovery-inventory/resources-ise` shows a visibly different eyebrow than `/discovery-inventory/resources` for the same resource type.

**Verification:**
- [ ] `npm run test -- src/features/discovery-inventory/resources --run`
- [ ] `npm exec eslint -- src/features/discovery-inventory/resources/components`
- [ ] Manual check: load both `/discovery-inventory/resources` and `/discovery-inventory/resources-ise` in the browser for at least one resource type and confirm the eyebrow text differs.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Estimated scope:** Medium: 6 files

## Checkpoint: Complete

- [ ] Focused tests for `src/features/discovery-inventory/resources` pass.
- [ ] Focused lint passes for all touched files.
- [ ] Both `/discovery-inventory/resources` and `/discovery-inventory/resources-ise` still work as two independent sidebar tabs, each correctly scoped to source/target providers.
- [ ] The ISE page's eyebrow now visibly indicates target/ISE context in all three locales.
- [ ] Commit contains only files related to this consolidation.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Extracting `ResourceRolePage` accidentally changes the `key` prop behavior on the resource-type sub-pages (used to reset state on tab change) | Medium | Keep the exact same `key={activeTab?.value}` pattern already present in both original files |
| New/changed locale key breaks a snapshot or i18n-completeness test | Low | Run the full `src/features/discovery-inventory/resources` and locale-related test files before committing |
| Czech/Slovak eyebrow wording doesn't match native-speaker expectations | Low | Follow the existing `nav.discovery.resourcesIse` translation style already present in each locale file; flag for a human native-speaker pass if uncertain |

## Open Questions

None — routes/sidebar stay independent (confirmed by the user); the shared-component approach only removes the duplicated implementation, not the two distinct entry points.
