# Implementation Plan: Resources — Collapsible KPI tiles (Variant A)

## Overview

Resources pages (VMware VMs, FlashSystem volumes, IBM Power partitions and Resources ISE,
which reuses the VMware page) render four KPI tiles above the inventory table. Variant A lets
the user collapse those tiles into a single-line summary strip ("36 VMs · 34 powered on ·
2 clusters · 424 GB memory") and expand them again. The choice is remembered in the browser,
so the table gets roughly 45–50 px more height on every visit once the user has collapsed it.

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
   no page-level wiring. (Open question 2 if the header placement is preferred.)
3. **Persistence via a small hook with an explicit key.** `useStoredBoolean(key, default)` in
   `src/shared/hooks/` following the SidebarContext pattern (lazy init, write in effect,
   try/catch, in-memory fallback). Resources pages share one key:
   `abcm-fe.discovery-inventory.metrics-collapsed.v1`, so collapsing on VMware also collapses
   FlashSystem/Power/ISE. Other features can adopt the component later with their own key.
4. **Default is expanded.** Existing users see no change until they click.
5. **`InventoryShell` is not modified.** The collapse is fully inside the `metrics` node.
6. **Accessibility.** Toggle buttons expose `aria-expanded` and `aria-controls` pointing at the
   grid/strip region; the strip lists the same values the cards show, so no information is
   hidden from screen readers when collapsed. No animation (or `motion-safe:` only).

## Task list

### Phase 1: Foundation
- [ ] Task 1: `useStoredBoolean` hook (S)
- [ ] Task 2: `CollapsibleMetrics` shared component + i18n keys (M)

### Checkpoint A
- [ ] Hook and component tests pass; no page uses the component yet.

### Phase 2: Resources pages
- [ ] Task 3: VMware / Resources ISE metrics use `CollapsibleMetrics` (S)
- [ ] Task 4: FlashSystem and IBM Power metrics use `CollapsibleMetrics` (S)

### Checkpoint B (complete)
- [ ] Focused tests, focused lint and typecheck pass.
- [ ] Manual check on all four Resources pages in light and dark theme.
- [ ] Human review of the look before merge.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Strip overflows on narrow widths (4 values + labels) | Med | `flex-wrap`, hide helper texts in strip, test at `< xl` where the grid is 2 columns today |
| Loading state looks broken when collapsed | Med | Strip renders the same skeleton widths as `StatCard` value placeholders when `isLoading` |
| Shared key collapses metrics on a page where user wanted them | Low | Documented as intended; per-page keys are a one-line change if requested |
| `localStorage` unavailable (private mode, blocked) | Low | try/catch with in-memory state, covered by a hook test |
| Existing page tests assert on tile labels | Low | Default expanded keeps current DOM; run the page tests listed in each task |

## Open questions

1. Should the preference be shared across all Resources providers (planned) or per provider tab?
2. Toggle placement: inside the metrics block (planned) or as "Show/Hide stats" in the page
   header next to Refresh, as in the mockup?
3. Default state for new users: expanded (planned) or collapsed?
