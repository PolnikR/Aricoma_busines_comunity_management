# Todo: Resources — Collapsible KPI tiles (Variant A)

Plan: `tasks/collapsible-kpi-variant-a-plan.md`

## Global constraints

- [x] Do not change `InventoryShell` or any page outside Discovery & Inventory → Resources.
- [x] Do not change metric computation (`mapInventoryToVirtualMachines`, item builders).
- [x] Default state (no stored preference) is collapsed; the choice is shared by all Resources tabs.
- [x] All new strings in `en.json`, `cs.json` and `sk.json`.
- [x] Focused tests and focused lint only; no full suite or production build unless asked.

## Phase 1 — Foundation

### Task 1 — `useStoredBoolean` hook

**Description:** Small hook that keeps a boolean in `localStorage` under a given key, following
the `SidebarContext` pattern.

**Acceptance criteria:**
- [x] `useStoredBoolean(key, defaultValue)` returns `[value, setValue]`; initial value read lazily.
- [x] Writes `'true'`/`'false'` on change; unknown stored values fall back to the default.
- [x] When `localStorage` throws on read or write, the hook still works in memory.

**Verification:**
- [x] `npm exec vitest run src/shared/hooks/useStoredBoolean.test.ts`
- [x] `npx eslint src/shared/hooks/useStoredBoolean.ts src/shared/hooks/useStoredBoolean.test.ts`

**Dependencies:** None

**Files likely touched:**
- `src/shared/hooks/useStoredBoolean.ts`
- `src/shared/hooks/useStoredBoolean.test.ts`

**Estimated scope:** S

### Task 2 — `CollapsibleMetrics` shared component

**Description:** Renders metric items either as the existing StatCard grid (with a "Hide stats"
button) or as a one-line summary strip button ("Show details"). Collapsed state comes from
`useStoredBoolean(storageKey, true)` (collapsed by default).

**Acceptance criteria:**
- [x] Expanded: same grid classes and `StatCard size="sm"` output as today, plus a "Hide stats"
      button with `aria-expanded="true"` and `aria-controls`.
- [x] Collapsed: single strip button listing `value label` for every item, `aria-expanded="false"`;
      click expands. Loading state shows value skeletons in the strip.
- [x] With empty storage the strip is rendered; state persists across remounts under the given
      `storageKey`; strip wraps on narrow widths.

**Verification:**
- [x] `npm exec vitest run src/shared/components/stat-card/CollapsibleMetrics.test.tsx src/shared/components/stat-card/StatCard.test.tsx`
- [x] `npx eslint src/shared/components/stat-card/`
- [x] Locale JSON parses (covered by any test importing locales) and `git diff --check`

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/components/stat-card/CollapsibleMetrics.tsx`
- `src/shared/components/stat-card/CollapsibleMetrics.test.tsx`
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json` (`metrics.hide`,
  `metrics.showDetails`, `metrics.summaryLabel`)

**Estimated scope:** M

### Checkpoint A

- [x] Task 1–2 tests pass together.
- [x] No production page uses the component yet.
- [x] Commit.

## Phase 2 — Resources pages

### Task 3 — VMware and Resources ISE

**Description:** `VirtualMachineMetrics` passes its existing `metricItems` to
`CollapsibleMetrics` with the shared Resources key
`abcm-fe.discovery-inventory.metrics-collapsed.v1` (constant in the resources feature).

**Acceptance criteria:**
- [x] VMware page shows the toggle; collapsing shows the strip, reload keeps it collapsed.
- [x] Resources ISE page (role `target`) behaves the same, sharing the preference.
- [x] Loading state (`isLoading`) renders correctly in both modes.
- [x] Existing tests that assert tile labels/helpers are updated for the collapsed default
      (or seed the expanded preference); storage is cleared between tests.

**Verification:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [x] `npx eslint` on changed files
- [ ] Manual: Resources → VMware VMs, collapse, reload, switch to Resources ISE.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.test.tsx`
- `src/features/discovery-inventory/resources/constants/…` or a local constant for the key

**Estimated scope:** S

### Task 4 — FlashSystem and IBM Power

**Description:** Private `MetricGrid` in `SourceInventoryMetrics.tsx` delegates to
`CollapsibleMetrics` with the same key, keeping `dynamicHelperIndexes` behaviour.

**Acceptance criteria:**
- [x] FlashSystem Volumes and IBM Power Partitions tabs show the same toggle and strip.
- [x] Collapsing on any Resources tab applies to all tabs.
- [x] Helper-loading behaviour for FlashSystem items 3–4 is unchanged when expanded; tests
      updated for the collapsed default.

**Verification:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- [x] `npx eslint` on changed files

**Dependencies:** Task 2 (can run in parallel with Task 3)

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.tsx`
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx`

**Estimated scope:** S

### Checkpoint B — Complete

- [x] All focused tests from Tasks 1–4 pass together.
- [x] `npm run typecheck` passes (shared component touched).
- [ ] Manual check of all four Resources tabs in light and dark theme, at `xl` and below.
- [ ] Human review of the look; commit.
