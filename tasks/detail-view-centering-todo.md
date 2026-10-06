# Todo: DetailView width within the usable viewport

Plan: `tasks/detail-view-centering-plan.md`. Stage explicit paths only.

## Task 1: Clamp the width to the containing block instead of 100vw
**Description:** Replace `w-[min(Xrem,calc(100vw-2rem))]` with a nominal `w-[Xrem]` and
a shared `max-w-[calc(100%-2rem)]`, and update the width tests.

**Acceptance criteria:**
- [x] md/lg/xl keep 55/60/75rem. All sizes share the same max-width. No `100vw` in the
  frame width. `left-1/2` and `-translate-x-1/2` stay.
- [x] With a page scrollbar at 800 px, the margins are about 16 px on each side of the usable area.

**Verification:**
- [x] `npm exec vitest run src/shared/components/detail-view`. Lint, typecheck and
  `git diff --check`.
- [x] Browser matrix in the plan (1440/800/390, light and dark).

**Dependencies:** None. **Files:** `DetailView.tsx`, `DetailView.test.tsx`. **Scope:** XS.

**Commit:** `fix(detail-view): center dialogs within usable viewport`
