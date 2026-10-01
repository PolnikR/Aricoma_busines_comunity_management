# Implementation Plan: Short-viewport floor for Resources and Infrastructure

Tasks: `tasks/short-viewport-route-floor-todo.md`.
Origin: finding 1 in `tasks/compact-page-header-measurements.md` (Task 13). That finding predates the compact
header work. This fix is separate from that work and does not touch `PageHeader`, `AppHeader` or the sidebar.

## Overview

Both routes are `contentScroll: 'contained'`. In that mode `AppShell` makes `<main>` `lg:overflow-hidden`, and
every layer down to the table/canvas is `flex-1 lg:min-h-0`, which means "shrink without limit". On short
desktop viewports the content therefore collapses:

- **Resources:** at 1280×600 and 1366×600, 1 of 2 VMware rows is visible.
- **Infrastructure:** at 1024×768 the toolbar wraps to three rows and the canvas is about 170 px.

The fix gives each route one lower bound and lets the route's own frame scroll vertically, but only when that
bound does not fit. At normal heights the bound is below the available space, so nothing scrolls and the layout
is identical to today.

## Current layout chain (lg+)

```
main (AppShell)            lg:overflow-hidden                     ← contained route; unchanged
└ Outlet wrapper           flex-1 lg:min-h-0                      ← unchanged
  Resources:
  └ ResourceViewportFrame → ContainedViewportFrame
      flex min-h-full flex-col lg:h-full lg:min-h-0 lg:overflow-hidden     ← clips, never scrolls
    ├ TableToolbar → PageHeader (shrink-0)
    └ InventoryShell root   flex flex-1 flex-col gap-4 lg:min-h-0
      ├ metrics / notice
      └ section             flex flex-1 flex-col lg:min-h-0               ← no floor
        └ Card              flex-1 overflow-hidden lg:min-h-0 → DataTable rows
  Infrastructure:
  └ InfrastructurePage root flex min-h-full flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0  ← clips
    ├ PageHeader, InfrastructureSourceSelector
    └ InfrastructureTopologyWorkspace Card
          h-dvh … overflow-hidden lg:h-auto lg:flex-1 lg:min-h-0            ← no floor
      ├ InfrastructureTopologyToolbar (wraps below xl)
      ├ canvas region       relative min-h-0 flex-1 overflow-hidden        ← no floor
      └ legend
```

## Architecture decisions

- **Scroll at the route frame, not at `<main>`.** `AppShell` and the `contained` route handle stay as they are.
  The router tests pin that contract, and other contained routes rely on it. Switching these routes to the
  default (non-contained) mode would let `min-h-min` use the table's full natural height, so pages would scroll
  at normal heights too.
  Instead, each route frame changes from `lg:overflow-hidden` to `lg:overflow-y-auto`. Because the frame keeps
  `lg:h-full lg:min-h-0`, it still fills the viewport. A scrollbar appears only when a child's floor makes its
  content taller than the frame.
- **The floor sits on the element whose collapse is the problem.**
  - Resources: the inventory card section (table + toolbar + pagination). The bound is not placed on the whole
    `InventoryShell`, so expanding the metrics cannot squeeze the table again.
  - Infrastructure: the canvas region only. The toolbar keeps wrapping freely, and the card grows by however
    tall the toolbar is.
- **Opt-in, Resources-only change to the shared `InventoryShell`.** `InventoryShell` gets one optional prop,
  `surfaceMinHeightClassName`. When it is set, it *replaces* the section's `lg:min-h-0`, and the shell root drops
  its own `lg:min-h-0`. `cn()` only joins strings and does not merge Tailwind classes, so stacking
  `lg:min-h-0 lg:min-h-[…]` would depend on CSS order.
  `ResourceInventoryShell.tsx` changes from a re-export to a thin wrapper that passes the Resources floor. VMware,
  FlashSystem, IBM Power and Resources ISE all get it from that one place. The 13 other `InventoryShell` pages
  pass nothing and are unchanged.
- **`ContainedViewportFrame` changes in place.** Its only consumer is `ResourceViewportFrame`.
  `lg:overflow-hidden` becomes `lg:overflow-y-auto`, and the frame contract becomes "fills the viewport; scrolls
  only when content has a floor that does not fit". Its test currently asserts `not.toHaveClass('overflow-y-auto')`
  ("not a data scroll region"). That assertion is replaced by one stating the new contract: the frame scrolls
  the route, while the data grid keeps its own scroll.
- **Infrastructure: `min-h-min` on the card.**
  - The card has `overflow-hidden`, so its automatic minimum is 0. Removing `lg:min-h-0` alone would not stop it
    shrinking.
  - `lg:min-h-min` makes the card's minimum toolbar + canvas floor + legend. That is the same `min-content`
    technique the short-viewport spec already uses in `AppShell`.
  - The canvas region gets `lg:min-h-[…]`. The base `min-h-0` stays, so mobile, which uses `h-dvh`, is unaffected.
  - The page root adds `lg:overflow-y-auto`. Its base `overflow-hidden` stays below lg.
- **CSS only.** No JS viewport measurement, and no changes to typography, buttons, density, `PageHeader` or
  `DataTable`.

### Floor values (tentative; Task 1 confirms them from a measured baseline)

| Route | Element | Floor | Why |
|---|---|---|---|
| Resources | inventory card section | `lg:min-h-[440px]` | The card holds the inventory header, toolbar, table header and pagination (about 320 px at 1366 width, from the Task 13 screenshots). 440 px leaves about 3–4 compact rows. It is below the card height at 1366×768 (≈520 px), so 768p-and-up viewports stay unchanged. |
| Infrastructure | canvas region | `lg:min-h-[280px]` | About 1.6× today's 170 px at 1024×768. It is at or below the canvas height at 1366×768 and up, so those stay unchanged. |

If the baseline in Task 1 shows either floor would change 1366×768 or 1920×1080, the value is lowered until it
does not. That rule (normal desktop unchanged) is fixed; the numbers are not.

## Task list

### Phase 1: Baseline
- [ ] Task 1: Measure the current card, row-region and canvas heights in the browser (no code)

### Phase 2: Fix (one commit per route)
- [ ] Task 2: Resources floor plus route-frame scroll
- [ ] Task 3: Infrastructure canvas floor plus page-root scroll

### Checkpoint A
- [ ] Focused tests, `tsc`, eslint and `git diff --check` green for Tasks 2–3

### Phase 3: Verify
- [ ] Task 4: Browser matrix before/after and a measurements doc

### Checkpoint B
- [ ] All acceptance criteria met; user review

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The route scrollbar sits inside `main`'s padding rather than at the card edge | Low | Accepted; it appears only on short viewports. Confirm in the screenshots that it looks right. |
| A fixed-position drawer or modal (VM detail, filter modal) inside the now-scrollable frame shifts or clips | Med | Drawers are portalled or fixed. Check the drawer open at 1366×600 in Task 4. |
| The floor makes 1366×768 scroll | Med | Task 1 measures the headroom first, and Task 4 asserts `frame.scrollHeight == clientHeight` at 1366×768, 1536×864 and 1920×1080. |
| React Flow mis-sizes when its container grows past the viewport | Med | The canvas keeps `size-full` inside a region with a definite min height. Check fit-view and zoom at 1024×768. |
| Expanded metrics (`Show details`) at 1366×768 push Resources into scrolling | Low | Expected and acceptable: the floor is on the card, so the user sees a scrollbar instead of a crushed table. Record it in Task 4. |
| The Infrastructure loading skeleton is still squeezed on short viewports | Low | Out of scope: it only shows while loading. Record it as a follow-up if it is visible. |

## Open questions

1. Commit granularity: one commit per route (recommended; each can be reverted independently), or one combined
   "short-viewport floor" commit? Both are separate from the compact-header commits.
