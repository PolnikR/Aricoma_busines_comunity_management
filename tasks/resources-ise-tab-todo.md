# Todo: Resources ISE Tab

## Task 1: Generalize `providerFilters.ts`

**Description:** Add `getProvidersByTypeAndRole(providers, type, role)` as the single canonical implementation. Redefine `getSourceProvidersByType` as a thin wrapper calling it with `role: 'source'` (behavior unchanged: treats missing `role` as source). Add `getTargetProvidersByType` as a thin wrapper with `role: 'target'` (strict equality — missing `role` is NOT a target).

**Acceptance criteria:**
- [ ] `getProvidersByTypeAndRole(providers, type, 'source')` behaves identically to the current `getSourceProvidersByType` (missing role → included)
- [ ] `getProvidersByTypeAndRole(providers, type, 'target')` only includes providers with `role === 'target'` exactly (missing role → excluded)
- [ ] `getSourceProvidersByType`'s existing 5 tests pass unmodified
- [ ] New tests for `getTargetProvidersByType`: matches type+target, excludes source, excludes missing-role, excludes non-matching type, empty when none match

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/utils/providerFilters.test.ts`

**Dependencies:** None

**Files likely touched:**
- `src/features/providers-connectors/providers/utils/providerFilters.ts`
- `src/features/providers-connectors/providers/utils/providerFilters.test.ts`

**Estimated scope:** XS

---

## Task 2: Generalize `buildResourceSourceTabs.ts`

**Description:** Extract the per-type tab-building loop (currently inline in `buildResourceSourceTabs`) into a private function parameterized by `role: ProviderRole`, using `getProvidersByTypeAndRole` from Task 1. Keep `buildResourceSourceTabs(providers, labels)` exported with its exact current signature, calling the private function with `role: 'source'`. Add a new exported `buildResourceTargetTabs(providers, labels)` calling it with `role: 'target'`.

**Acceptance criteria:**
- [ ] `buildResourceSourceTabs`'s existing 4 tests pass unmodified (no signature or behavior change)
- [ ] `buildResourceTargetTabs` produces the same tab shape (`value`, `resourceTab`, `providerId`, `label`) but sourced from target-role providers
- [ ] New tests: target-only providers produce populated tabs; source-only providers produce `:none` tabs for `buildResourceTargetTabs`

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts`

**Estimated scope:** S

---

## Checkpoint: After Tasks 1-2
- [ ] Both helper test files green
- [ ] No page/hook/route files touched yet — safe rollback point

---

## Task 3: Add `role` parameter to `useResourceInventoryQueries`

**Description:** Add a 4th parameter `role: ProviderRole = 'source'` to `useResourceInventoryQueries(activeTab, providers, providerId, role)`. Replace the internal `getSourceProvidersByType(providers, providerType)` call with `getProvidersByTypeAndRole(providers, providerType, role)`.

**Acceptance criteria:**
- [ ] Default (`role` omitted) behaves exactly as today — all 6 existing tests pass unmodified
- [ ] Passing `role: 'target'` restricts `matchingProviders` to target-role providers of the active type

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.ts`

**Estimated scope:** XS

---

## Task 4: Add target-role regression test to `useResourceInventoryQueries.test.tsx`

**Description:** Add a test: given a source-role and a target-role FlashSystem provider, calling the hook with `role: 'target'` fetches/attributes only the target-role provider; calling with `role: 'source'` (or omitted) only the source-role one.

**Acceptance criteria:**
- [ ] New test passes; all prior tests still pass

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Estimated scope:** XS

---

## Checkpoint: After Tasks 3-4
- [ ] Hook fully role-aware and tested — this is the data-fetching layer both Resources and Resources ISE will rely on

---

## Task 5: Thread `role` into `VmwareResourcesPage.tsx` + `SourceResourcesPageProps`

**Description:** Add `role: ProviderRole` to `SourceResourcesPageProps` (required field). In `VmwareResourcesPage.tsx`, replace `getSourceProvidersByType(providers, 'VMWARE')` with `getProvidersByTypeAndRole(providers, 'VMWARE', role)`, destructuring `role` from props.

**Acceptance criteria:**
- [ ] `VmwareResourcesPage` filters by the passed role, not hardcoded source
- [ ] `ResourcesPage.test.tsx` fixture(s) updated to pass `role: 'source'` where `SourceResourcesPageProps` is constructed/mocked — existing tests pass

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/SourceResourcesPageProps.ts`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx` (pass `role="source"` in `sourcePageProps`)
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx` (if it mocks/asserts props directly)

**Estimated scope:** S

---

## Task 6: Thread `role` into `FlashSystemResourcesPage.tsx`

**Description:** Replace the local `getSourceProvidersByType(providers, 'FLASHCOPY')` with `getProvidersByTypeAndRole(providers, 'FLASHCOPY', role)`. Pass `role` through to `useResourceInventoryQueries(tab, providers, providerId, role)`.

**Acceptance criteria:**
- [ ] Page filters and fetches by the passed role, not hardcoded source

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Dependencies:** Task 3, Task 5

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.tsx`

**Estimated scope:** XS

---

## Task 7: Thread `role` into `IbmPowerResourcesPage.tsx`

**Description:** Same pattern as Task 6, for `IBM_POWER`.

**Acceptance criteria:**
- [ ] Page filters and fetches by the passed role, not hardcoded source

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Dependencies:** Task 3, Task 5

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.tsx`

**Estimated scope:** XS

---

## Checkpoint: After Tasks 5-7
- [ ] `ResourcesPage.test.tsx` green with `role="source"` explicitly threaded — Resources page behavior unchanged end-to-end
- [ ] All three sub-pages are now role-agnostic and ready to be reused by Resources ISE

---

## Task 8: Add i18n keys and nav key for Resources ISE

**Description:** Add a `pages.resourcesIse` namespace (`eyebrow`, `title`, `description` at minimum — mirror whatever subset of `pages.virtualMachines.*` top-level keys `ResourcesPage.tsx` itself uses, e.g. lines 187-189's `TableToolbar` props, and `ariaLabel`/similar if present at the page-composition level) to `en.json`, `sk.json`, `cs.json`. Add `'Resources ISE': 'nav.discovery.resourcesIse'` to `navKeyMap` (wired to the sidebar entry in Task 11) and its translations.

**Acceptance criteria:**
- [ ] New keys present in all three locale files with real (not placeholder) copy
- [ ] Key names follow the existing `pages.<page>.*` / `nav.<group>.<item>` conventions

**Verification:**
- [ ] `git diff --check` on the three locale files (valid JSON, no syntax errors) — or run the app's i18n lint/typecheck if one exists
- [ ] Manual check: no `"TODO"` / placeholder strings left in any of the three locale files

**Dependencies:** None (can run in parallel with Phase 1-3)

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** XS

---

## Task 9: Create `ResourcesIsePage.tsx` + test

**Description:** Create `src/features/discovery-inventory/resources/pages/ResourcesIsePage.tsx`, closely mirroring `ResourcesPage.tsx` (read that file's current content first): same `useProviders()` + `useResourceTabSearchParam()` wiring, but calling `buildResourceTargetTabs` instead of `buildResourceSourceTabs`, and passing `role="target"` in `sourcePageProps`. Use the new `pages.resourcesIse.*` keys from Task 8 for the page-level `TableToolbar` eyebrow/title/description (sub-page internals keep using `pages.virtualMachines.*` as today, per plan assumption 3). Add `ResourcesIsePage.test.tsx` mirroring `ResourcesPage.test.tsx`'s structure/mocks, adjusted for target-role provider fixtures.

**Acceptance criteria:**
- [ ] Page renders the three tabs (VMware/FlashSystem/IBM Power) using `buildResourceTargetTabs`
- [ ] With a mix of source+target providers, only target-role ones populate tabs/data
- [ ] Test mirrors `ResourcesPage.test.tsx` coverage for the ISE page

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx`

**Dependencies:** Task 2, Task 5, Task 6, Task 7, Task 8

**Files likely touched:**
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.tsx` (new)
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx` (new)

**Estimated scope:** M

---

## Task 10: Register the route

**Description:** Add `resourcesIse: '/discovery-inventory/resources-ise'` to `src/app/routes.ts` (alongside `resources` at line 25). Import `ResourcesIsePage` and add `<Route path="discovery-inventory/resources-ise" element={<ResourcesIsePage />} />` in `src/app/AppRoutes.tsx`, following the existing (non-lazy) pattern used for `ResourcesPage`.

**Acceptance criteria:**
- [ ] Navigating to `/discovery-inventory/resources-ise` renders `ResourcesIsePage`
- [ ] Existing `/discovery-inventory/resources` route and redirects are untouched

**Verification:**
- [ ] Manual check: `npm run dev`, navigate to the new URL, confirm it renders (per CLAUDE.md — UI changes should be checked in a real browser, not just unit tests)

**Dependencies:** Task 9

**Files likely touched:**
- `src/app/routes.ts`
- `src/app/AppRoutes.tsx`

**Estimated scope:** XS

---

## Task 11: Add sidebar navigation entry

**Description:** In `src/layouts/app-shell/AppSidebar.tsx`, add `{ name: 'Resources ISE', path: routes.resourcesIse }` as a new sub-item in the "Discovery & Inventory" group's `subItems` array (sibling to `Resources`, line ~50), and add `'Resources ISE': 'nav.discovery.resourcesIse'` to `navKeyMap` (from Task 8).

**Acceptance criteria:**
- [ ] "Resources ISE" appears in the sidebar under "Discovery & Inventory", after "Resources"
- [ ] Clicking it navigates to and highlights correctly (uses existing `findRouteMenu`/active-state logic — verify no special-casing needed since it follows the established `subItems` pattern)

**Verification:**
- [ ] Manual check: `npm run dev`, confirm the sidebar entry appears and highlights when active

**Dependencies:** Task 10

**Files likely touched:**
- `src/layouts/app-shell/AppSidebar.tsx`

**Estimated scope:** XS

---

## Checkpoint: Complete
- [ ] All 11 tasks done
- [ ] Full focused test run green (command below)
- [ ] Manual walkthrough: seed/observe both a source-role and target-role provider of at least one type; confirm Resources shows only the source one and Resources ISE shows only the target one, with identical layout/columns/filters between the two pages
- [ ] `grep -rn "getProvidersByTypeAndRole\|getSourceProvidersByType\|getTargetProvidersByType" src/features` — confirm no remaining inline `provider.role ===`/`!==` checks outside the canonical helpers
- [ ] Commit created per CLAUDE.md verify-and-commit rule (this is a multi-phase feature — consider one commit per phase, or one commit at the end if the whole thing lands together; match whatever granularity the user prefers when you get here)

### Full focused verification command (run once, at the end)
```
npm exec vitest run \
  src/features/providers-connectors/providers/utils/providerFilters.test.ts \
  src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts \
  src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx \
  src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx \
  src/features/discovery-inventory/resources/pages/ResourcesIsePage.test.tsx
```
