# Implementation Plan: Unified Resource Layout and Provider Fetch Gate

## Overview

Align FlashSystem and IBM Power tabs with the existing VMware visual hierarchy and make provider discovery an explicit prerequisite for all provider-scoped inventory requests. Implementation changes remain uncommitted.

## Architecture Decisions

- Every resource source uses the same page hierarchy: source header → four metrics → one inventory card.
- The inventory card owns the inventory title/description, tabs, toolbar, table/empty state, and pagination.
- Provider state is modeled separately from inventory state; a provider request error must never be presented as “no provider configured.”
- Inventory queries are enabled only after the provider list query succeeds.
- After provider success, only providers matching the selected tab are queried.

## Task 1: Extract a shared Resources inventory shell

**Description:** Introduce a focused layout component used by VMware, FlashSystem, and IBM Power so metrics and inventory content occupy the same hierarchy and spacing.

**Acceptance criteria:**

- [ ] All three tabs render metrics directly below the page header.
- [ ] All three tabs render tabs inside the header of the same large inventory card.
- [ ] Toolbar, table, and pagination use the same bordered/scrollable content region and responsive spacing.

**Verification:**

- [ ] Component/page tests assert the shared visual structure for every tab.
- [ ] Manual comparison at 320, 768, 1024, and 1440 px.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx`
- `src/features/discovery-inventory/resources/components/FlashSystemInventoryView.tsx`
- `src/features/discovery-inventory/resources/components/PowerInventoryView.tsx`

**Estimated scope:** Medium

## Task 2: Gate inventory queries on provider query success

**Description:** Extend the provider-aware inventory hook contract so no inventory request can start until provider discovery has completed successfully.

**Acceptance criteria:**

- [ ] While providers are pending, the selected source shows loading and runs zero inventory requests.
- [ ] If providers fail, the page shows a provider-specific retry state and runs zero inventory requests.
- [ ] After provider success, zero matching providers shows the configuration empty state; matching providers start one cached inventory query each.

**Verification:**

- [ ] Hook tests cover pending, failure, no matching provider, and matching provider transitions.
- [ ] Page tests prove provider error and no-provider states are distinct.
- [ ] Switching tabs queries only the newly selected provider type and reuses cached inventory.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/hooks/useResourceInventoryQueries.ts`
- `src/features/discovery-inventory/hooks/useResourceInventoryQueries.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Estimated scope:** Medium

## Task 3: Source-specific loading inside the shared shell

**Description:** Keep the inventory shell stable while provider or inventory data loads, using source-specific metric/table skeletons or a compatible shared skeleton without moving the tab controls.

**Acceptance criteria:**

- [ ] Tabs remain visible and usable during provider/inventory loading.
- [ ] Loading does not cause the inventory card to jump between unrelated layouts.
- [ ] Empty, provider-error, inventory-error, and partial-provider-error states render inside the same content hierarchy.

**Verification:**

- [ ] Page tests cover state transitions without duplicated headers/cards.
- [ ] Keyboard navigation reaches all tabs, refresh, filters, rows, and drawer close control.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- shared Resources shell and state components
- relevant page tests and translations

**Estimated scope:** Small

## Final Checkpoint

- [ ] Lint and typecheck pass.
- [ ] All targeted tests pass.
- [ ] Full suite passes with the stable worker limit.
- [ ] Production Vite bundle succeeds.
- [ ] Code review finds no correctness, accessibility, security, or performance blockers.
- [ ] No implementation commit is created.
