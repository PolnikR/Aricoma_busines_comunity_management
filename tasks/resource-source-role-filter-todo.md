# Todo: Resource Pages — Source-Role Provider Filtering

## Task 1: Add `getSourceProvidersByType` helper and unit tests

**Description:** Add a new exported function to `src/features/providers-connectors/providers/utils/providerFilters.ts` that filters a provider list to a given `ProviderType` AND excludes `role === 'target'` (missing `role` counts as source, matching existing conventions in this file).

**Acceptance criteria:**
- [ ] `getSourceProvidersByType(providers, type)` returns providers matching `type` where `role !== 'target'`
- [ ] A provider with `role: undefined` and matching `type` is included (treated as source)
- [ ] A provider with `role: 'target'` and matching `type` is excluded
- [ ] A provider with non-matching `type` is excluded regardless of `role`

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/providers-connectors/providers/utils/providerFilters.test.ts`
- [ ] Manual check: none needed (pure function)

**Dependencies:** None

**Files likely touched:**
- `src/features/providers-connectors/providers/utils/providerFilters.ts`
- `src/features/providers-connectors/providers/utils/providerFilters.test.ts` (new)

**Estimated scope:** XS (1 file + 1 new test file)

---

## Task 2: Refactor `buildResourceSourceTabs.ts` to use the helper

**Description:** Replace the inline `provider.type === providerType && provider.role !== 'target'` filter in `buildResourceSourceTabs` with a call to `getSourceProvidersByType`. Pure refactor — no behavior change, existing tests must pass unmodified.

**Acceptance criteria:**
- [ ] `buildResourceSourceTabs.ts` imports and uses `getSourceProvidersByType` instead of its inline filter
- [ ] No change to `buildResourceSourceTabs.test.ts` is needed — all existing cases still pass

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`

**Estimated scope:** XS (1 file, no new tests)

---

## Checkpoint: After Tasks 1-2
- [ ] `providerFilters.test.ts` and `buildResourceSourceTabs.test.ts` both green
- [ ] No other files touched yet — safe rollback point

---

## Task 3: Filter `matchingProviders` by source role in `useResourceInventoryQueries`

**Description:** In `useResourceInventoryQueries.ts:50`, change the `matchingProviders` computation from `providers.filter(p => p.type === providerType)` to `getSourceProvidersByType(providers, providerType)`. This is the actual data-fetching gate (`enabled`, fallback provider selection for `flashSystemInventories`/`powerInventories`, and `failures` attribution) — the most important fix in this plan since it's closest to the real API calls.

**Acceptance criteria:**
- [ ] `matchingProviders` excludes target-role providers of the active type
- [ ] `enabled` (query gating) reflects the role-filtered count, not the type-only count
- [ ] Existing behavior for legacy fixtures without `role` is unchanged (still treated as source)

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.ts`

**Estimated scope:** XS (1 file)

---

## Task 4: Add target-only-provider regression test to `useResourceInventoryQueries.test.tsx`

**Description:** Add a test case: given a provider list containing only a `role: 'target'` FlashSystem provider (no source-role FlashSystem provider), the hook must report `hasProviders: false` and never call `fetchFlashSystemInventory`.

**Acceptance criteria:**
- [ ] New test: target-only provider of the active type → `hasProviders` is `false`, no fetch call made
- [ ] Existing 5 tests in this file still pass unmodified

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx`

**Estimated scope:** XS (1 file, additive test)

---

## Checkpoint: After Tasks 3-4
- [ ] Hook-level tests green, including the new regression case
- [ ] This is the critical fix — the pages in Phase 3 are defense-in-depth on top of this

---

## Task 5: Fix `VmwareResourcesPage.tsx`

**Description:** Replace `filterByType(providers, 'VMWARE')` at line 48 with `getSourceProvidersByType(providers, 'VMWARE')`. This also fixes the `vmwareProviders[0]?.id` fallback at line 49, which is the exact leak scenario described in the design (falls back to a target-only provider when `providerId` prop is null).

**Acceptance criteria:**
- [ ] `vmwareProviders` (used for empty-state check, loading gate, and fallback `selectedProviderId`) excludes target-role providers
- [ ] With only a target-role VMware provider present, the page shows the "no provider" empty state instead of fetching/displaying that provider's VMs

**Verification:**
- [ ] Tests pass: run the new/updated test from Task 8 for this page
- [ ] Manual check: with browser devtools or a temporary mock, confirm the empty state renders for a target-only-provider scenario (see Task 8 for the automated version of this)

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`

**Estimated scope:** XS (1 file)

---

## Task 6: Fix `FlashSystemResourcesPage.tsx`

**Description:** Replace the inline `providers.filter((provider) => provider.type === 'FLASHCOPY')` at line 17 with `getSourceProvidersByType(providers, 'FLASHCOPY')`.

**Acceptance criteria:**
- [ ] `sourceProviders` excludes target-role FlashSystem providers
- [ ] Empty-state and loading gates reflect the role-filtered list

**Verification:**
- [ ] Tests pass: run the new/updated test from Task 8 for this page

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.tsx`

**Estimated scope:** XS (1 file)

---

## Task 7: Fix `IbmPowerResourcesPage.tsx`

**Description:** Replace the inline `providers.filter((provider) => provider.type === 'IBM_POWER')` at line 17 with `getSourceProvidersByType(providers, 'IBM_POWER')`.

**Acceptance criteria:**
- [ ] `sourceProviders` excludes target-role IBM Power providers
- [ ] Empty-state and loading gates reflect the role-filtered list

**Verification:**
- [ ] Tests pass: run the new/updated test from Task 8 for this page

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.tsx`

**Estimated scope:** XS (1 file)

---

## Task 8: Add regression tests for all three resource pages

**Description:** These three page components currently have no dedicated `.test.tsx` files (confirmed: no `VmwareResourcesPage.test.tsx`, `FlashSystemResourcesPage.test.tsx`, or `IbmPowerResourcesPage.test.tsx` exist). Add one focused test file per page (or a shared parametrized test, whichever fits the existing test conventions better once you look at `ResourcesPage.test.tsx` for the mocking pattern used for `useProviders`/inventory hooks) covering: given only a target-role provider of the page's type, the page renders the "no provider" empty state and does not call the inventory-fetch hook with that provider's id.

**Acceptance criteria:**
- [ ] VMware page: target-only provider → empty state shown, `useDiscoveryInventory` not called with the target provider's id
- [ ] FlashSystem page: target-only provider → empty state shown
- [ ] IBM Power page: target-only provider → empty state shown
- [ ] A second case per page: a normal source-role provider still works as before (no regression)

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.test.tsx src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.test.tsx`

**Dependencies:** Tasks 5, 6, 7

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx` (new)
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.test.tsx` (new)
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.test.tsx` (new)

**Estimated scope:** M (3 new test files, first tests for these components — will need to establish the mocking pattern for each page's data hooks)

---

## Checkpoint: Complete
- [ ] All 8 tasks done
- [ ] Focused test run across all touched files is green (see command list below)
- [ ] `grep -rn "provider.type ===" src/features/discovery-inventory/resources src/features/providers-connectors/providers` shows no remaining inline type-only filters used for resource-page provider gating (the helper itself is allowed to contain the check)
- [ ] Commit created per CLAUDE.md verify-and-commit rule

### Full focused verification command (run once, at the end)
```
npm exec vitest run \
  src/features/providers-connectors/providers/utils/providerFilters.test.ts \
  src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts \
  src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx \
  src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx \
  src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.test.tsx \
  src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.test.tsx
```
