# Implementation Plan: centre DetailView on the AppShell content surface

Task list: `tasks/detail-view-content-centering-todo.md`. Branch `spike/ant-design-shell`.

## Analysis (2026-10-06)

### AppShell split
- `AppShell.tsx:27` is a flex row: `<AppSidebar/>` + `<section>` (`flex-1`, the content
  surface with header and `<main>`). Shell padding `lg:p-3 xl:p-4`, gap `gap-3 xl:gap-4`.
- Sidebar `< lg`: `fixed` off-canvas drawer (`-translate-x-full`), so the section spans the
  whole viewport. `≥ lg`: `lg:static` flex item. Width `lg:w-max lg:min-w-[272px]
  lg:max-w-[min(352px,32vw)]`, collapsed `lg:w-18`. It can only be collapsed from `xl` (1280).
  Its width depends on label content, so no breakpoint-based constant is correct.
- `SidebarContext` exposes only booleans (expanded/collapsed/mobile), no geometry. There is
  no layout CSS variable today.

### DetailView rendering
- No portal. Backdrop (`fixed inset-0 z-40`) and dialog (`fixed top-1/2 left-1/2 z-50`) are
  rendered in place inside each consumer, i.e. inside `section > main > … `.
- Containing block: no ancestor of any of the 18 consumers sets transform, filter,
  backdrop-filter, contain, container-type, will-change or perspective (audited). `fixed`
  therefore resolves against the viewport, and `left-1/2` centres on the viewport.
- Stacking: no ancestor creates a stacking context, so z-40/z-50 compete in the body context.

### Measured in Edge (Platform Providers, md, height 900)
| viewport | sidebar | section (content) | dialog | point over sidebar hits |
|---|---|---|---|---|
| 1440 | 16–288 | 304–1424, centre 864 | 280–1160, centre 720 | **sidebar** |
| 1280 | 16–288 | 304–1264, centre 784 | 200–1080, centre 640 | **sidebar** |
| 1100 | 12–284 | 296–1088, centre 692 | 110–990, centre 550 | dialog |
| 800 | off-canvas | 0–800, centre 400 | 16–784, centre 400 | – |

### Root causes
1. Centring: the dialog is centred on the viewport (its containing block), not on the
   section. On desktop that offsets it by half the sidebar slot (~144 px at 1440).
2. Backdrop vs sidebar (newly found): on `lg` the sidebar keeps `z-50` as a static flex
   item (flex items honour z-index; `translate` also makes it a stacking context). The
   backdrop is `z-40`, so the sidebar paints **above** it: undimmed and clickable while a
   DetailView is open. `Modal` has the same backdrop z-40 and the same defect.

## Change

1. **AppShell publishes the content-surface geometry** (the layout contract): a
   `useLayoutEffect` measures the `<section>` with `getBoundingClientRect()` and a
   `ResizeObserver`, and sets `--app-content-left` / `--app-content-width` (px) on the
   shell root. Sidebar toggle, sidebar width and window resize all change the section width,
   so the observer covers them. Guarded like `Tabs.tsx` when `ResizeObserver` is missing.
   Below `lg` the measured section is the full width, so no breakpoint is needed.
2. **DetailView consumes it**, with fallbacks equal to today's values:
   - `left-1/2` → `left-[calc(var(--app-content-left,0px)+var(--app-content-width,100%)/2)]`
   - `max-w-[calc(100%-2rem)]` → `max-w-[calc(var(--app-content-width,100%)-2rem)]`
   - Translate, height, vertical centring, md/lg/xl widths, backdrop unchanged.
   Outside AppShell (tests, any future host) the result is exactly the current behaviour.
3. **Sidebar under the backdrop on desktop**: `AppSidebar` gets `lg:z-40` (mobile keeps
   `z-50`). Same z as the backdrop, earlier in the DOM, so the backdrop (DetailView and
   Modal) covers it, while the sidebar stays above content and the header (`z-30`), so the
   collapsed-rail flyouts still overlay the page.

### Visual effect
- Desktop: dialog centred on the content surface; centre 864 instead of 720 at 1440.
- When the content surface is narrower than the nominal width + 2rem, the width is capped
  to the content surface (e.g. 1280 expanded: lg/xl 928 instead of 960/1200; 1100: md 760
  instead of 880). The dialog never overlaps the sidebar.
- Sidebar is dimmed by the backdrop and no longer clickable while a dialog is open.
- `< lg`: unchanged (section = viewport).

## Files
- `src/layouts/app-shell/AppShell.tsx`, `AppShell.test.tsx`
- `src/layouts/app-shell/AppSidebar.tsx`, `AppSidebar.test.tsx`
- `src/shared/components/detail-view/DetailView.tsx`, `DetailView.test.tsx`
- No consumer files.

## Why it is shared and safe
- One change in DetailView applies to all 18 consumers; none passes positioning classes.
- Fallbacks reproduce the current values, so a missing contract degrades to today's layout.
- Audit found no consumer ancestor creating a containing block, so viewport-based
  `getBoundingClientRect` coordinates match the `fixed` coordinates in every consumer.
- Nested dialogs: Modal/HelpPopover z-order unchanged relative to DetailView.

## Alternatives rejected
- Hardcoded sidebar offset: wrong for collapsed, `w-max`, and the 32vw cap.
- CSS anchor positioning: zero JS, but needs fallback rules that `cn` (tailwind-merge)
  would collapse, browser support outside Chromium is uneven, and jsdom cannot test it.
- Making the section the containing block: would clip the backdrop to the section.

## Verification
- `npm exec vitest run src/layouts/app-shell/AppShell.test.tsx src/layouts/app-shell/AppSidebar.test.tsx src/shared/components/detail-view/DetailView.test.tsx src/shared/components/modal/nestedDialogs.test.tsx`
- `npm exec eslint <changed files>`, `npm run typecheck`, `git diff --check`.
- Edge CDP: 1440 / 1280 expanded and collapsed / 1100 / 800 / 390; dialog centre = section
  centre (±1 px), margins ≥ 16 px, point over the sidebar hits the backdrop.

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| First paint before measurement | Low | `useLayoutEffect` runs before paint; fallback is the current centre |
| Narrower dialogs on 1024–1279 | Med | Intended (stays within content); confirm with user |
| `lg:z-40` changes sidebar vs content overlays | Low | Content has no z ≥ 40 elements overlapping the sidebar; flyouts checked in browser |

## Open questions
- Accept the width cap to the content surface (recommended) vs keeping the viewport cap and
  only shifting the centre (dialog would then overlap the sidebar or need a clamp)?
- Include the `lg:z-40` sidebar fix in this change (recommended, requirement 1) or separately?

## Result (2026-10-06, Edge, height 900)
| case | size | sidebar | section centre | dialog centre | width | gaps to section | point over sidebar |
|---|---|---|---|---|---|---|---|
| 1440 expanded | md / xl | 272 | 864 | 864 / 864 | 880 / 1088 | 120 / 16 | backdrop |
| 1440 collapsed | md / xl | 72 | 764 | 764 / 764 | 880 / 1200 | 220 / 60 | backdrop |
| 1280 expanded | md / xl | 272 | 784 | 784 / 784 | 880 / 928 | 40 / 16 | backdrop |
| 1280 collapsed | md / xl | 72 | 684 | 684 / 684 | 880 / 1128 | 140 / 16 | backdrop |
| 1100 | md / xl | 272 | 692 | 692 | 760 | 16 | backdrop |
| 800 / 390 | md / xl | off-canvas | 400 / 195 | 400 / 195 | 768 / 358 | 16 | – |

- Backdrop 0,0 → full viewport in every case. A real CDP mouse click on a sidebar item
  (expanded and collapsed, Platform Providers and Recovery Groups) hits the backdrop
  (`pointerdown`/`mousedown`/`mouseup`/`click`), closes the dialog, route unchanged.
- Collapsed-rail flyout (no dialog) is still visible and on top of the page.
