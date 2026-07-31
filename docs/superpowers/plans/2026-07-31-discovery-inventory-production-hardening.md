# Implementation Plan: Discovery Inventory Production Hardening

## Overview

Implement the approved Discovery Inventory hardening without dependency changes
or commits. Work proceeds from data correctness through provider-safe filtering
and error states to localization, accessibility, and complete verification.

## Architecture decisions

- Preserve the existing provider-first page and provider-scoped FlashSystem/Power
  query architecture.
- Generate resource keys in mappers, using normalized non-empty backend identity
  first and deterministic collision suffixes only when required.
- Represent FlashSystem pool and host filters with provider-scoped composite
  values while retaining original IDs on resource models.
- Keep technical errors in the data/query layer and expose only localized,
  generic messages in presentation components.
- Implement modal focus behavior once in the shared `DetailDrawer`.
- Do not modify dependencies, the lockfile, `.claude/`, or Git history.

## Phase 1: Data correctness

### Task 1: Harden Power resource identity

**Description:** Add non-empty identity selection and deterministic duplicate
handling to the Power mapper.

**Acceptance criteria:**

- Empty identity fields fall through to the next usable field.
- Every mapped partition ID is non-empty and unique within its provider payload.
- Existing valid backend identities retain their current key shape.

**Verification:**

- Extend and run `mapPowerInventory.test.ts`.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/helpers/mapPowerInventory.ts`
- `src/features/discovery-inventory/helpers/mapPowerInventory.test.ts`

**Estimated scope:** Small

### Task 2: Harden FlashSystem resource identity

**Description:** Accept an empty backend volume ID and derive a deterministic,
provider-scoped resource key with duplicate handling.

**Acceptance criteria:**

- A missing or empty volume ID does not reject the full payload.
- Every mapped volume has a non-empty unique `resourceId`.
- Normal valid volume IDs preserve their current resource key.

**Verification:**

- Extend schema and mapper tests.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/api/schemas/flashSystemInventorySchema.ts`
- `src/features/discovery-inventory/helpers/mapFlashSystemInventory.ts`
- `src/features/discovery-inventory/helpers/mapFlashSystemInventory.test.ts`

**Estimated scope:** Medium

### Task 3: Preserve VMware server errors

**Description:** Remove the special case that converts filtered HTTP 500
responses to an empty VMware inventory.

**Acceptance criteria:**

- HTTP 500 rejects the query.
- Genuine successful empty responses still map to an empty inventory.
- API tests document both outcomes.

**Verification:**

- Run `discoveryInventoryApi.test.ts`.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- `src/features/discovery-inventory/api/discoveryInventoryApi.test.ts`

**Estimated scope:** Small

## Checkpoint 1

- Run focused schema, mapper, and API tests.
- Run TypeScript typecheck.

## Phase 2: Provider isolation and UI states

### Task 4: Make FlashSystem filters provider-safe

**Description:** Use provider-scoped option values for pools and hosts and match
both provider and source identifiers.

**Acceptance criteria:**

- Equal pool or host IDs from different providers remain separate options.
- Selecting one option returns resources from only its provider.
- Existing provider, search, and status filters continue working.

**Verification:**

- Extend `filterSourceResources.test.ts` with multi-provider fixtures.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/discovery-inventory/resources/helpers/filterSourceResources.ts`
- `src/features/discovery-inventory/resources/helpers/filterSourceResources.test.ts`
- `src/features/discovery-inventory/resources/model/sourceInventoryTypes.ts`
- `src/features/discovery-inventory/resources/components/SourceInventoryToolbar.tsx`

**Estimated scope:** Medium

### Task 5: Separate loading, empty, and error presentation

**Description:** Ensure skeletons render only for pending queries and replace raw
errors with localized messages.

**Acceptance criteria:**

- Provider and inventory errors render a terminal error state.
- No-provider and empty states never leave metric skeletons running.
- Partial failure shows provider names but no technical error messages.

**Verification:**

- Extend `ResourcesPage.test.tsx`.
- Add focused tests for `NonVmwareResourcesPage`.

**Dependencies:** Task 3

**Files likely touched:**

- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources/components/NonVmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/NonVmwareResourcesPage.test.tsx`

**Estimated scope:** Medium

### Task 6: Verify provider-scoped cache reuse and aggregation

**Description:** Strengthen hook and metrics tests for tab changes, partial
provider failures, and combined inventories.

**Acceptance criteria:**

- Switching away and back within stale time does not refetch cached provider data.
- One failed provider does not suppress healthy provider resources.
- Metrics deduplicate provider-local pool IDs correctly.

**Verification:**

- Extend query-hook and metric component tests.

**Dependencies:** Tasks 2 and 4

**Files likely touched:**

- `src/features/discovery-inventory/hooks/useResourceInventoryQueries.test.tsx`
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx`
- existing test fixtures or local test builders

**Estimated scope:** Medium

## Checkpoint 2

- Run Discovery Inventory test files with at most two Vitest workers.
- Run lint and typecheck.

## Phase 3: Localization and accessibility

### Task 7: Complete source inventory localization

**Description:** Move known FlashSystem and Power detail labels, boolean values,
metric helper text, and generic errors into the translation catalog.

**Acceptance criteria:**

- No known source-inventory UI labels are hardcoded in English.
- Boolean values use locale-aware yes/no translations.
- EN, SK, and CS contain the same new keys.

**Verification:**

- Add component assertions for translated details.
- Run existing translation consistency tests, if present.

**Dependencies:** Task 5

**Files likely touched:**

- `src/features/discovery-inventory/resources/components/FlashSystemVolumeDetailPanel.tsx`
- `src/features/discovery-inventory/resources/components/IbmPowerDetailPanel.tsx`
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.tsx`
- `src/features/discovery-inventory/resources/config/powerFieldRegistry.ts`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium, split by component if implementation exceeds five
files at once.

### Task 8: Complete detail drawer focus management

**Description:** Add initial focus, keyboard focus trapping, and focus restoration
to the shared detail drawer.

**Acceptance criteria:**

- Opening the drawer moves focus inside it.
- Tab and Shift+Tab cycle through drawer controls.
- Escape closes it and focus returns to the opener.

**Verification:**

- Extend `DetailDrawer.test.tsx` with user-event keyboard tests.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/data-table/DetailDrawer.tsx`
- `src/shared/components/data-table/DetailDrawer.test.tsx`

**Estimated scope:** Small

### Task 9: Add representative payload and detail regressions

**Description:** Exercise the supplied Power and FlashSystem shapes through
schemas, mappers, tables, details, and metrics.

**Acceptance criteria:**

- Requested Power fields and unitless volume capacity render correctly.
- FlashSystem pool, host, capacity, and copy relationships render correctly.
- Representative fixtures fail tests if a required mapping is removed.

**Verification:**

- Run all source inventory schema, mapper, view, and detail tests.

**Dependencies:** Tasks 1, 2, and 7

**Files likely touched:**

- source inventory mapper and component test files
- scoped fixtures under `src/features/discovery-inventory`

**Estimated scope:** Medium

## Final checkpoint

- `npm test -- --maxWorkers=2`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Confirm `package.json`, lockfile, `.claude/`, and Git history are unchanged.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Fallback identity changes across reordered payloads | Medium | Prefer stable fields and use occurrence suffix only for true collisions |
| Composite filter value leaks into API data | Medium | Keep it as UI filter state and parse it at the filter boundary |
| Focus trap interferes with drawer resize control | Medium | Include every focusable drawer element in the focus cycle |
| Translation key drift across locales | Medium | Add the same explicit keys to all locales and run consistency tests |
| Large tests become brittle | Low | Assert user-visible contracts rather than complete DOM snapshots |

## Open questions

None. The approved design defines the required behavior.
