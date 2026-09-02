# Task 3 report — Resources surface radius and request-state geometry

## Files changed

- `src/shared/components/inventory-shell/InventoryPanel.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryStates.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx`

## Rationale

- The bordered inventory panel now uses the canonical `rounded-[20px]` radius.
- Loading, empty, and fatal-state surfaces preserve the same flexible, bounded primary-surface geometry. Empty and fatal content occupies the data-row slot of the existing toolbar/data/pagination topology.
- Tests lock the radius, containment, and state-surface class contracts without using JSDOM pixel measurements.

## Verification

- `C:\\Users\\polnikr\\AppData\\Roaming\\nvm\\v22.23.1\\npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx` — 4 files, 29 tests passed.
- `C:\\Users\\polnikr\\AppData\\Roaming\\nvm\\v22.23.1\\npm.cmd exec eslint src/shared/components/inventory-shell/InventoryPanel.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx` — passed.
- `git diff --check` — passed.

## Self-review

- Scope is limited to the Resources state contract, its shared panel implementation, and focused tests (four source/test files).
- No API, query, filter, provider, or business semantics changed.
- Toolbar, data viewport, and pagination ownership remain unchanged for the data panel.

## Commit

- `fix: normalize Resources surface state geometry` (this report is included in that atomic task commit).
