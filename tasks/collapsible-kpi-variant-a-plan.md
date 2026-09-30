# Implementation Plan: Resources — Collapsible KPI tiles (Variant A)

## Overview

Resources pages (VMware VMs, FlashSystem volumes, IBM Power partitions and Resources ISE,
which reuses the VMware page) render four KPI tiles above the inventory table. Variant A lets
the user collapse those tiles into a single-line summary strip ("36 VMs · 34 powered on ·
2 clusters · 424 GB memory") and expand them again. The strip is the default; the choice is
remembered in the browser, so the table gets roughly 45–50 px more height unless the user has
expanded the tiles.

Nothing else on the page changes: page header, "Inventory records" header, provider tabs,
toolbar and table stay as they are. Mockup: https://claude.ai/artifact/KXh17DNikRSbUgWTyT6vWy
(variant "A · Skrývateľné KPI").

Tasks: `tasks/collapsible-kpi-variant-a-todo.md`.

## Verified current state

- `VirtualMachineMetrics.tsx` (VMware, also used by Resources ISE) and `SourceInventoryMetrics.tsx`
  (`FlashSystemMetrics`, `PowerMetrics` via private `MetricGrid`) each render the same markup:
  `grid shrink-0 grid-cols-2 gap-2.5 xl:grid-cols-4` of `StatCard size="sm"`.
- Metrics reach the page through the `metrics` slot of `ResourceInventoryShell`
  (re-export of `src/shared/components/inventory-shell/InventoryShell.tsx`). `InventoryShell`
  is used by ~15 pages outside Resources, so it must not change behaviour for them.
- Metric values come from `mapInventoryToVirtualMachines.ts` and are not affected by filters.
- There is no Collapsible/Accordion primitive; disclosures use native `<details>` elsewhere.
- Per-user UI preferences use raw `localStorage` wrapped in try/catch with a module-level key
  (pattern: `src/layouts/app-shell/SidebarContext.tsx`, namespaced keys like
  `abcm-fe.infrastructure-topology.node-positions.v1`). No user-settings API exists.
- Shared components call `useTranslation()` directly (e.g. `DataTablePagination`).
  Locales: `src/locales/{en,cs,sk}.json`, flat keys.
- Tests: Vitest + Testing Library. Focused run: `npm exec vitest run <file>`.

## Architecture decisions

1. **One shared component, not three copies.** Add `CollapsibleMetrics` under
   `src/shared/components/stat-card/`. It takes the same metric items the three grids already
   build (`label`, `value`, `helper`, `icon`, `isHelperLoading`) plus `isLoading`, and renders
   either the StatCard grid or the summary strip. `VirtualMachineMetrics` and `MetricGrid`
   switch to it; their item computation stays untouched.
2. **Toggle lives inside the metrics block, not in the page header.** The mockup placed
   "Show stats" next to Refresh; that would require lifting state into four page components and
   `TableToolbar`. Instead: collapsed strip is itself a `<button aria-expanded>`, expanded grid
   has a small "Hide stats" text button aligned right above/next to the grid. Self-contained,
   no page-level wiring. (Confirmed by user 2026-09-30.)
3. **Persistence via a small hook with an explicit key.** `useStoredBoolean(key, default)` in
   `src/shared/hooks/` following the SidebarContext pattern (lazy init, write in effect,
   try/catch, in-memory fallback). Resources pages share one key:
   `abcm-fe.discovery-inventory.metrics-collapsed.v1`, so collapsing on VMware also collapses
   FlashSystem/Power/ISE. Other features can adopt the component later with their own key.
4. **Default is collapsed.** Without a stored preference the summary strip is shown; users
   who want the tiles click once and the choice is remembered. (Confirmed by user 2026-09-30.)
5. **`InventoryShell` is not modified.** The collapse is fully inside the `metrics` node.
6. **Accessibility.** Toggle buttons expose `aria-expanded` and `aria-controls` pointing at the
   grid/strip region; the strip lists the same values the cards show, so no information is
   hidden from screen readers when collapsed. No animation (or `motion-safe:` only).

## Task list

### Phase 1: Foundation
- [x] Task 1: `useStoredBoolean` hook (S)
- [x] Task 2: `CollapsibleMetrics` shared component + i18n keys (M)

### Checkpoint A
- [x] Hook and component tests pass; no page uses the component yet.

### Phase 2: Resources pages
- [x] Task 3: VMware / Resources ISE metrics use `CollapsibleMetrics` (S)
- [x] Task 4: FlashSystem and IBM Power metrics use `CollapsibleMetrics` (S)

### Checkpoint B (complete)
- [x] Focused tests, focused lint and typecheck pass.
- [ ] Manual check on all four Resources pages in light and dark theme.
- [ ] Human review of the look before merge.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Strip overflows on narrow widths (4 values + labels) | Med | `flex-wrap`, hide helper texts in strip, test at `< xl` where the grid is 2 columns today |
| Loading state looks broken when collapsed | Med | Strip renders the same skeleton widths as `StatCard` value placeholders when `isLoading` |
| Shared key collapses metrics on a page where user wanted them | Low | Documented as intended; per-page keys are a one-line change if requested |
| `localStorage` unavailable (private mode, blocked) | Low | try/catch with in-memory state, covered by a hook test |
| Existing tests assert on tile labels/helpers | Med | Default collapsed changes the DOM: update assertions to the strip, or seed `localStorage` with the expanded value in tests that check tile details; clear storage in `beforeEach` |

## Resolved questions (user, 2026-09-30)

1. Preference is shared across all Resources providers and Resources ISE: **yes**.
2. Toggle placement: **inside the metrics block**, as planned.
3. Default state without a stored preference: **collapsed**.

## Implementation notes (2026-09-30)

- `useStoredBoolean` writes to `localStorage` only on an explicit change, never on mount, so a
  later change of the default still reaches users who never toggled.
- `src/shared/hooks/useStoredBoolean.test.ts` was added to `domTypescriptTests` in
  `vitest.config.ts` (it needs jsdom `localStorage`).
- Locale keys added: `metrics.hide`, `metrics.showDetails`. The planned `metrics.summaryLabel`
  was not needed: the strip button's accessible name is its visible text.
- The expanded state shows a chevron icon button (aria-label "Hide stats") beside the grid,
  so expanding adds no extra row.
- Storage key constant: `resources/state/resourceMetricsPreference.ts`.
