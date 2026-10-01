# Compact page header: browser measurements (Task 13)

**Date:** 2026-10-01
**Build measured:** this repo at `80541d7e`, Vite dev server on `http://localhost:5173`.
The process command line was checked, and the server serves `AppHeader.tsx` with `h-14`.
**Browser:** Microsoft Edge with a throwaway profile, driven over CDP. The user signed in to Keycloak.
**Viewport:** `Emulation.setDeviceMetricsOverride` at each size with `deviceScaleFactor: 1`. `mobile: true` is set below 500 px.
These are viewport sizes, so the browser's own toolbars are not subtracted.
`1366×600` was added to stand in for the usable height of a real 1366×768 laptop.
**Navigation:** SPA navigation (`history.pushState` + `popstate`). After each navigation the script sampled the page until it settled.
**Language:** the profile was in Slovak, so the titles below are Slovak.

## Method

The script read these values from the page at each size:

| Field | How it was measured |
|---|---|
| `header` | `<header>` height |
| `content top` | top of the element after the `PageHeader` block, minus the top of the content card. This is where the table, metrics or panel starts. |
| `v-scroll` | `main.scrollHeight > clientHeight` |
| `h-scroll` | document `scrollWidth > clientWidth` |
| `actions on title row` | top of the actions block above the bottom of the `h1` |
| `overlap` | any action button's rectangle intersects the `h1` rectangle |

There is one screenshot per combination: 8 sizes × 6 pages = 48. They are kept outside the repo in the session
scratchpad (`matrix-out/`).

**Baseline for comparison:** the same probe ran once against the old build, before the dev server was switched
(branch `test` at `3eb0fd0a`, which has the 72 px header and the eyebrow).
Platform providers at 1280×600 measured `header 72`, `content top 197`.
On the new build the same probe measured `header 56`, `content top 149`.

## Results

`content top` is given in px. Two marks are used in the table:

- **†** The description wraps to two lines (+20 px), because the actions or a narrower width leave it less room. This is expected.
- **‡** Mobile: the actions wrap below the title.

| Viewport | Platform providers | Resources (VMware) | Identity: users | Identity: user federation | Recovery group create | Infrastructure |
|---|---|---|---|---|---|---|
| 1280×600 | 149 | 149 | 149 | 169 † | 149 | 149 |
| 1366×768 | 149 | 149 | 149 | 149 | 149 | 149 |
| 1366×600 | 149 | 149 | 149 | 149 | 149 | 149 |
| 1536×864 | 149 | 149 | 149 | 149 | 149 | 149 |
| 1920×1080 | 149 | 149 | 149 | 149 | 149 | 149 |
| 2560×1440 | 149 | 149 | 149 | 149 | 149 | 149 |
| 1024×768 | 169 † | 149 | 149 | 169 † | 149 | 169 † |
| 390×844 | 212 ‡ | 212 ‡ | 168 | 212 ‡ | 212 ‡ | 212 ‡ |

These values were the same for all 48 combinations:

- `header` = **56** px.
- `v-scroll` = **false**. No page scrollbar appeared at any size.
- `h-scroll` = **false**. No horizontal overflow.
- `overlap` = **false**. Title and actions never collide.
- The actions sit on the title row at every desktop and tablet width. On 390 px they wrap below the title.
  Identity's Users section has no header action, so that column is n/a.
- The sidebar brand row is 56 px, and its bottom edge equals the header's bottom edge at every desktop and tablet
  size (`brandAligned: true`). At 390 px the sidebar is off-canvas, so the check does not apply there.

## Checks from the plan

| Viewport | Expectation | Result |
|---|---|---|
| 1280×600 (short) | Page scrolls; the row region keeps its 200 px floor | **Partly met; see Finding 1.** No page scrollbar appears, because these routes are `contained`. The table shrinks instead. The header itself is correct. |
| 1366×768 | Compare to today | Content starts at 149 px, against 197 px on the old build: **48 px gained** (plan estimate was ≈42 px). |
| 1366×600 (real laptop) | Record whether the scrollbar is gone | No page scrollbar. Resources shows 1 of 2 rows; see Finding 1. |
| 1536×864 | No page scrollbar | Met |
| 1920×1080 | No page scrollbar; table ~42 px higher | Met. The table is 48 px higher. |
| 2560×1440 | No page scrollbar; header row not stretched | Met. Title on the left, actions on the right, single row. |
| 1024×768 | Actions stay on the title row or wrap cleanly | Met. **Identity user federation: `Add LDAP` + `Add Kerberos` share the title row and nothing overlaps.** The description wraps to two lines (†). |
| 390×844 | Actions wrap below the title; sidebar toggle works | Met. Actions wrap below the title and the sidebar toggle is shown. The table scrolls horizontally inside its card. |
| All | No jump from skeleton to loaded page | Not measurable with this method. The skeleton has no `<h1>`, so samples taken during loading read `null`. Every settled sample was stable (one value per page). The heading geometry is covered by unit tests: `RouteLoadingSkeleton.test.tsx`, `AppShellSkeleton.test.tsx`. |

## Findings (not caused by this change)

1. **Short viewports squeeze contained pages.** On `Resources` at 1280×600 and 1366×600, the metrics bar,
   provider tabs, filter chips and toolbar leave room for a single table row. The second row is reached through
   the table's internal scrollbar. `Infrastructure` at 1024×768 gives the topology canvas about 170 px, because
   its toolbar wraps to three lines.
   These routes use `contentScroll: 'contained'`, which uses `lg:min-h-0` and has no `min-h-min` floor (see
   `docs/superpowers/specs/2026-08-27-short-viewport-content-overflow-design.md`). This behavior exists on the
   old build too. The compact header gives 48 px back to it.
   A row-region floor on contained routes would be a separate change.
2. **`Add LDAP` / `Add Kerberos` render as disabled** in the user-federation section. That is their existing
   state and was not changed here.

## Conclusion

The compact header is identical across all eight sizes and six pages: a 56 px top bar, title and actions on one
row, a one-line description, and no eyebrow or search bar. It causes no clipping, overlap, page scrollbar or
horizontal overflow. The vertical gain over the old build is 48 px per page on desktop.
