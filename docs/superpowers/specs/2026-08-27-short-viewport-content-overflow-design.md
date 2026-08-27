# Short-Viewport Content Overflow

## Problem Statement

On short browser windows, page content becomes physically unreachable. It is not
clipped-but-scrollable — there is no scrollbar to reach it with.

The app shell pins itself to the viewport and every layer below it is told to
shrink without limit:

| Layer | File | Classes |
| --- | --- | --- |
| Shell | `AppShell.tsx` | `lg:h-screen lg:overflow-hidden` |
| Section | `AppShell.tsx` | `lg:min-h-0 lg:overflow-hidden` |
| Main | `AppShell.tsx` | `flex-1 lg:min-h-0 lg:overflow-hidden` |
| Page shell | `InventoryShell.tsx` | `flex-1 lg:min-h-0` |
| Card | `InventoryShell.tsx` | `flex-1 lg:min-h-0 overflow-hidden` |

Every layer is `flex-1` plus `min-h-0`, which means "shrink as far as needed" with
no lower bound. Content therefore never overflows, and because it never overflows
no scrollbar appears. Instead the table region shrinks toward zero height while the
fixed chrome above it — page title, metrics, panel header, toolbar, pagination —
keeps its full size.

Measured on the Resources ISE page at a 560px-tall viewport, the row region
collapses to under 20px. The records exist in the DOM and cannot be reached.

`DataTable` is consumed by 39 files, so this is a property of the shell rather than
a defect in one page.

## Constraints

Stated by the product owner, in priority order:

1. **No scrollbar on real hardware.** Laptops, desktops, and ultrawide monitors must
   fit their content without a page scrollbar. This is the binding constraint.
2. **A scrollbar only on genuinely small windows**, and only then.
3. **Dynamic, not switched.** No visible breakpoint where behaviour jumps.

## Solution

Give the content a lower bound so it can overflow, and let `overflow-auto` reveal a
scrollbar only when overflow actually happens.

The lower bound is computed by the browser from the page's own content rather than
hardcoded, using `min-height: min-content`:

```
main            lg:overflow-auto            (was lg:overflow-hidden)
Outlet wrapper  flex flex-1 flex-col min-h-min
row region      min-h-[200px]
```

The browser then resolves each page's floor as:

```
page title + metrics (at their current wrap) + panel header
  + toolbar + 200px of rows + pagination
```

Because `min-content` is evaluated per page and per width, a page with no metrics
gets a smaller floor, and a page whose metrics have wrapped to two rows gets a
correspondingly larger one. Only one number is authored: 200px, the minimum useful
row region.

### Why not a fixed pixel floor

A fixed floor (`lg:min-h-[440px]`) was designed and rejected. It fails in the
1024–1280px width band: `StatCard`'s grid is `grid-cols-1 sm:grid-cols-2
xl:grid-cols-4`, so below 1280px the metrics wrap from one row (80px) to two
(172px). The page needs 92px more, but the floor does not know that:

```
440 − 329 (page chrome) − 92 (second metrics row) = 19px of rows
```

That reproduces the original defect in a different band. A fixed floor also depends
on a 144px chrome constant derived from `xl:p-4`, `lg:h-[72px]`, and `lg:py-5` in
two other files, with nothing linking them — any future change to shell padding or
header height would silently invalidate it.

`min-content` has neither problem: it derives the floor from what is actually
rendered.

## Behaviour

Since `overflow-auto` paints a scrollbar only on real overflow, the outcome is:

| Viewport height | Behaviour |
| --- | --- |
| Above the page's own floor | Identical to today. No scrollbar, no visual change. |
| Below it | Page scrolls; the row region keeps 200px and stays usable. |

The threshold is not a constant — it is whatever each page needs.

`AppHeader` is a sibling of `main`, not a descendant, so search and user controls
stay pinned while content scrolls.

### The row minimum decides whether 768p laptops scroll

This is the one decision the design cannot make on its own, and it is a direct
trade against constraint 1.

A 1366×768 laptop has roughly 600px of viewport and therefore about 456px of content
area. Whether it gets a scrollbar depends entirely on the row minimum, because the
floor is `page chrome + row minimum`:

| Row minimum | Approx. rows | Floor | 1366×768 laptop |
| --- | --- | --- | --- |
| 200px | 4 | ~530px | scrollbar appears |
| 130px | 3 | ~460px | borderline |
| 100px | 2 | ~430px | no scrollbar |

The page-chrome figure of roughly 330px used above is **an estimate derived from the
Tailwind classes, not a measurement**. The real value must be measured in the browser
before the row minimum is fixed — that measurement is the first implementation task,
not a later check.

Constraint 1 says no scrollbar on real hardware. Honouring it strictly on 768p
laptops forces the row minimum down to about two rows, which is a weak table. The
two defensible resolutions are:

- **Hold constraint 1.** Set the row minimum so 768p laptops never scroll, accepting
  a two-row minimum table in that worst case.
- **Relax constraint 1 for 768p only.** Keep a four-row minimum and let 1366×768
  laptops scroll, on the grounds that a short scroll is better than an unusable
  table, and that every other listed device still fits.

The product owner must choose. The design supports either; only the number changes.

## Scope

### In scope

- `AppShell.tsx` — `main` overflow, and a wrapper around `Outlet` carrying the floor.
- The row region inside the shared data-table kit — the `min-h-[200px]` bound.
- `AppSidebar.tsx` — the collapsed rail currently sets `overflow-visible` so its
  flyouts are not clipped, which lets nav icons spill out of the panel on short
  windows. It needs the same bounded treatment.

### Out of scope

- The 39 feature components built on `DataTable`. None are modified.
- Width-driven responsiveness beyond the metrics wrap already described. Narrow
  layouts (below 1024px) keep today's mobile behaviour.
- Making fixed chrome adaptive — for example compacting metrics on short viewports.
  This would reduce the floor further and is a reasonable follow-up, but it changes
  visual design rather than fixing reachability, so it is deliberately deferred.

## Testing Decisions

**Unit tests cannot validate this change.** jsdom has no layout engine:
`getBoundingClientRect` returns zeros and overflow is never computed. This is the
same blind spot that let a clipped-flyout defect pass 17 green tests earlier in this
work. Writing unit tests that assert on measured heights would test mocks, not
behaviour.

Verification is therefore visual and manual, and is a required implementation step
rather than an optional check. It begins with a measurement, because the row minimum
depends on it:

0. Measure actual rendered page chrome in the browser on the sample pages, and fix
   the row minimum against the table in "The row minimum decides whether 768p
   laptops scroll".
1. A representative sample of pages, chosen to span the chrome variations:
   - Resources ISE — four metrics plus a table, the heaviest chrome
   - Recovery Applications — table with page header, no metrics
   - Identity & Access — sectioned layout with its own navigation
   - Infrastructure Topology — non-table content
2. At three widths: **1100px** (metrics wrapped, sidebar not collapsible),
   **1366px**, **1920px**.
3. At two heights per width: a typical one, and one deliberately below the floor.
4. For each combination, confirm: no scrollbar above the floor; a scrollbar below
   it; the row region never below 200px; the header stays pinned.

Unit tests are still added for anything with logic rather than layout — none is
currently anticipated, since the change is entirely declarative classes.

## Open Questions

- **What is the row minimum?** Blocking; see "The row minimum decides whether 768p
  laptops scroll". Resolve by measuring real page chrome first, then choosing
  between holding constraint 1 and keeping a four-row table. Everything else in this
  design is settled.

## Further Notes

The `1024–1280px` width band deserves attention during verification for a second
reason: `SidebarContext` forces `isExpanded` false below 1280px, so the sidebar
cannot be collapsed there while still occupying 272px statically. That band
therefore has both the widest sidebar footprint and the tallest metrics. It is the
worst case for this change and the most likely place to find a problem.
