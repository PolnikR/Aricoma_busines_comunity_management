# Todo: Resources — Collapsible KPI tiles (Variant A)

Plan: `tasks/collapsible-kpi-variant-a-plan.md`

## Global constraints

- [ ] Do not change `InventoryShell` or any page outside Discovery & Inventory → Resources.
- [ ] Do not change metric computation (`mapInventoryToVirtualMachines`, item builders).
- [ ] Default state is expanded; existing DOM is unchanged until the user collapses.
- [ ] All new strings in `en.json`, `cs.json` and `sk.json`.
- [ ] Focused tests and focused lint only; no full suite or production build unless asked.

## Phase 1 — Foundation

### Task 1 — `useStoredBoolean` hook

**Description:** Small hook that keeps a boolean in `localStorage` under a given key, following
the `SidebarContext` pattern.

**Acceptance criteria:**
- [ ] `useStoredBoolean(key, defaultValue)` returns `[value, setValue]`; initial value read lazily.
- [ ] Writes `'true'`/`'false'` on change; unknown stored values fall back to the default.
- [ ] When `localStorage` throws on read or write, the hook still works in memory.

**Verification:**
- [ ] `npm exec vitest run src/shared/hooks/useStoredBoolean.test.ts`
- [ ] `npx eslint src/shared/hooks/useStoredBoolean.ts src/shared/hooks/useStoredBoolean.test.ts`

**Dependencies:** None

**Files likely touched:**
- `src/shared/hooks/useStoredBoolean.ts`
- `src/shared/hooks/useStoredBoolean.test.ts`

**Estimated scope:** S

### Task 2 — `CollapsibleMetrics` shared component

**Description:** Renders metric items either as the existing StatCard grid (with a "Hide stats"
button) or as a one-line summary strip button ("Show details"). Collapsed state comes from
`useStoredBoolean(storageKey, false)`.

**Acceptance criteria:**
- [ ] Expanded: same grid classes and `StatCard size="sm"` output as today, plus a "Hide stats"
      button with `aria-expanded="true"` and `aria-controls`.
- [ ] Collapsed: single strip button listing `value label` for every item, `aria-expanded="false"`;
      click expands. Loading state shows value skeletons in the strip.
- [ ] State persists across remounts under the given `storageKey`; strip wraps on narrow widths.

**Verification:**
- [ ] `npm exec vitest run src/shared/components/stat-card/CollapsibleMetrics.test.tsx src/shared/components/stat-card/StatCard.test.tsx`
- [ ] `npx eslint src/shared/components/stat-card/`
- [ ] Locale JSON parses (covered by any test importing locales) and `git diff --check`

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/components/stat-card/CollapsibleMetrics.tsx`
- `src/shared/components/stat-card/CollapsibleMetrics.test.tsx`
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json` (`metrics.hide`,
  `metrics.showDetails`, `metrics.summaryLabel`)

**Estimated scope:** M

### Checkpoint A

- [ ] Task 1–2 tests pass together.
- [ ] No production page uses the component yet.
- [ ] Commit.

## Phase 2 — Resources pages

### Task 3 — VMware and Resources ISE

**Description:** `VirtualMachineMetrics` passes its existing `metricItems` to
`CollapsibleMetrics` with the shared Resources key
`abcm-fe.discovery-inventory.metrics-collapsed.v1` (constant in the resources feature).

**Acceptance criteria:**
- [ ] VMware page shows the toggle; collapsing shows the strip, reload keeps it collapsed.
- [ ] Resources ISE page (role `target`) behaves the same, sharing the preference.
- [ ] Loading state (`isLoading`) renders correctly in both modes.

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [ ] `npx eslint` on changed files
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
- [ ] FlashSystem Volumes and IBM Power Partitions tabs show the same toggle and strip.
- [ ] Collapsing on any Resources tab applies to all tabs.
- [ ] Helper-loading behaviour for FlashSystem items 3–4 is unchanged when expanded.

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- [ ] `npx eslint` on changed files

**Dependencies:** Task 2 (can run in parallel with Task 3)

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.tsx`
- `src/features/discovery-inventory/resources/components/SourceInventoryMetrics.test.tsx`

**Estimated scope:** S

### Checkpoint B — Complete

- [ ] All focused tests from Tasks 1–4 pass together.
- [ ] `npm run typecheck` passes (shared component touched).
- [ ] Manual check of all four Resources tabs in light and dark theme, at `xl` and below.
- [ ] Human review of the look; commit.
