# Implementation Plan: DetailView width within the usable viewport

Task list: `tasks/detail-view-centering-todo.md`. Branch `spike/ant-design-shell`.

## Measured root cause (before, 2026-10-06)
- Pages with a vertical scrollbar at 800×900 (Access Log, Snapshot Policy): `innerWidth`
  800, `clientWidth` 785, scrollbar 15 px.
- Dialog: left 8.4, right (to the usable edge) 8.6, width 768, centre 392.4 against a
  usable centre of 392.5.
- So the dialog is already centred in the usable area. `left-1/2` and the translate
  resolve against the fixed containing block, which excludes the scrollbar. The defect
  is the width: `min(Xrem, 100vw - 2rem)` uses `100vw`, which includes the scrollbar.
  The clamp therefore gives 768 instead of 753, and each side margin shrinks from 16 to
  about 8 px. (The earlier "8 px offset" note measured the right edge against
  `innerWidth`, which includes the scrollbar.)
- Pages without a scrollbar (Platform Provider, Identity User, Recovery Group, VMware)
  at 1440/800/390: margins are equal, and 16 px when clamped.

## Change
- Width: `w-[55rem]` / `w-[60rem]` / `w-[75rem]` plus a shared
  `max-w-[calc(100%-2rem)]`. A percentage on a fixed element resolves against the
  containing block (the usable viewport), the same box `left-1/2` uses. The clamp and
  the centring then refer to the same width, so the margins are 1rem and symmetric with
  or without a scrollbar.
- Only `DetailView.tsx` (the width map) and `DetailView.test.tsx` change. Height, vertical
  centring, radius, backdrop, navigation, footer and consumers are untouched.

## Verification
- Focused tests: `npm exec vitest run src/shared/components/detail-view`. Lint,
  typecheck and `git diff --check`.
- Browser (Edge CDP 9333): md (Platform Provider, Identity User, Snapshot Policy), lg
  (Access Log), xl (Recovery Group, VMware) at 1440×900, 800×900 and 390×844, plus dark
  mode. Margins equal against `clientWidth`, 16 px when clamped. Nominal 880/960/1200 at
  1440. No overflow, console clean.

## Risks
| Risk | Mitigation |
|---|---|
| `max-w` loses to another `max-w` utility | The frame has no other `max-w`. Checked in the browser via the computed style. |
| Width changes at 390 px | 100% = 390, so the width is 358, the same as before. Measured. |
