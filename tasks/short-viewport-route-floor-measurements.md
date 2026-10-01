# Short-viewport floor: browser measurements (Task 4)

**Date:** 2026-10-01
**Fix commits:**
- `94bbf09c`: Resources
- `d9eca4df`: Infrastructure

**Build:** this repo's Vite dev server on `http://localhost:5173`. The process command line was checked, and the
served modules contain the new classes.

**Browser:** Edge with a throwaway profile, driven over CDP. The user signed in to Keycloak.

**Viewport:** `Emulation.setDeviceMetricsOverride` at each size with `deviceScaleFactor: 1`; `mobile: true` below
500 px.

**Language:** each run pins the UI language (`localStorage['app-language']` + reload).
- Runs are in English (`en`) and Slovak (`sk`). Slovak has the longest labels and wraps the topology toolbar the most.
- The before values come from a baseline run on the pre-fix code at HEAD `84f48d14` (Task 1). That baseline was in
  English only.
- The pre-fix Infrastructure values in Slovak come from a run made after the Resources fix but before the
  Infrastructure fix. Infrastructure was untouched at that point.

## Method

| Field | How it was measured |
|---|---|
| route scroll | `frame.scrollHeight − frame.clientHeight`. The frame is the route root (`ResourceViewportFrame` / `InfrastructurePage` root). `0` means no scrollbar. |
| card | Resources: inventory card section height. Infrastructure: workspace card height. |
| row band (rows) | Resources: height of the table row area inside the card. It is clipped by every overflow ancestor up to the card, so it does not depend on route scrolling. In brackets: rows fully reachable without scrolling inside the table. |
| toolbar / canvas | Infrastructure: toolbar height and canvas-region height |
| h-scroll | document `scrollWidth > clientWidth` |

## Resources (VMware tab, 2 VMs)

`lg:min-h-[480px]` on the inventory card.

| Viewport | Before: card / row band (rows) / route scroll | After en | After sk |
|---|---|---|---|
| 1280×600 | 353 / 26 (0/2) / 0 | **480 / 149 (2/2) / 128** | 480 / 149 (2/2) / 128 |
| 1366×600 | 353 / 26 (0/2) / 0 | **480 / 149 (2/2) / 128** | 480 / 149 (2/2) / 128 |
| 1366×768 | 521 / 149 (2/2) / 0 | 521 / 149 (2/2) / 0 (unchanged) | 521 / 149 (2/2) / 0 |
| 1024×768 | 529 / 149 (2/2) / 0 | 529 / 149 (2/2) / 0 (unchanged) | 529 / 149 (2/2) / 0 |
| 1536×864 | 617 / 65 (2/2) / 0 | 617 / 65 (2/2) / 0 (unchanged) | 617 / 144 (2/2) / 0 |
| 1920×1080 | 833 / 65 (2/2) / 0 | 833 / 65 (2/2) / 0 (unchanged) | 833 / 65 (2/2) / 0 |
| 390×844 | 607 / 149 (2/2) / 0, frame 789 | 607 / 149 (2/2) / 0, frame 789 (unchanged) | 659 / 149 (2/2) / 0, frame 861 |

At 1536×864 in Slovak the row band is 144 px instead of 65 because the longer labels wrap the rows. The same
value appears in the Slovak run taken right after the Resources fix (`94bbf09c`), so the wrapping comes from the
labels, not from this change.

At 1366×600 two more checks were made:
- **Route scrolled to the bottom:** the pagination ("Showing 1–2 of 2", rows-per-page select) is fully visible.
- **VM detail drawer opened from a row while scrolled:** the drawer is `position: fixed`, overlays the full 600 px
  viewport, and closes with a real Escape key press. After closing it is `inert`, `aria-hidden` and translated
  off-screen.

## Infrastructure (VMware vSphere, 233 nodes)

The workspace card changes `lg:min-h-0` to `lg:min-h-min`, the canvas region gets `lg:min-h-[260px]`, and the page
root gets `lg:overflow-y-auto`.

| Viewport | Before en: toolbar / canvas / route scroll | After en | Before sk | After sk |
|---|---|---|---|---|
| 1280×600 | 69 / 143 / 0 | **69 / 260 / 117** | 115 / 97 / 0 | **115 / 260 / 163** |
| 1366×600 | 69 / 143 / 0 | **69 / 260 / 117** | 115 / 97 / 0 | **115 / 260 / 163** |
| 1366×768 | 69 / 311 / 0 | 69 / 311 / 0 (unchanged) | 115 / 265 / 0 | 115 / 265 / 0 (unchanged) |
| 1024×768 | 167 / 221 / 0 | **167 / 260 / 39** | 167 / 177 / 0 | **167 / 260 / 84** |
| 1536×864 | 69 / 407 / 0 | 69 / 407 / 0 (unchanged) | 69 / 407 / 0 | 69 / 407 / 0 |
| 1920×1080 | 69 / 623 / 0 | 69 / 623 / 0 (unchanged) | 69 / 623 / 0 | 69 / 623 / 0 |
| 390×844 | 267 / 457 / 0, card 844 | 267 / 457 / 0, card 844 (unchanged) | 359 / 365 / 0 | 359 / 365 / 0 (unchanged) |

At 1024×768 the toolbar still wraps to three rows and every control stays visible (screenshot checked). The floor
is 260 px rather than the tentative 280 px, because the Slovak canvas at 1366×768 is 265 px. A 280 px floor would
have added a 15 px scroll on a normal desktop.

## Acceptance criteria

| Criterion | Result |
|---|---|
| Resources table/inventory no longer excessively compressed on short desktop viewports | Met. Row band 26 → 149 px, 0/2 → 2/2 rows, card 353 → 480 px. |
| Infrastructure canvas no longer unusably small when the toolbar wraps | Met. 221 → 260 px (en) and 177 → 260 px (sk) at 1024×768; 143/97 → 260 px at 600 px height. |
| Short pages may scroll vertically when necessary | Met. The route frame scrolls (117–163 px) only where the floor does not fit. |
| Normal desktop behavior unchanged | Met. At 1366×768, 1536×864 and 1920×1080, card, row and canvas heights equal the baseline, with 0 route scroll, in both languages. |
| No horizontal page overflow | Met. `h-scroll` was false in all 28 after-fix measurements. |
| Mobile unchanged | Met. 390×844 is identical to the pre-fix values in both languages (only `lg:` classes changed). |

## Findings (not changed here)

1. **The topology toolbar overlaps itself in Slovak at about 1366 px.** The search and host fields cover the
   All / Powered on / Powered off toggle. This happens before and after the fix, and it is a toolbar grid issue.
   The toolbar was deliberately left as it is. Track it separately.
2. **The Infrastructure loading skeleton** (`InfrastructureTopologySkeleton`) has no floor and is still squeezed on
   short viewports while loading. It was not changed, to keep this fix minimal.
