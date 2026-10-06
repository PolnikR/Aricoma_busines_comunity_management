# Todo: centre DetailView on the AppShell content surface

Plan: `tasks/detail-view-content-centering-plan.md`. Stage explicit paths only.

## Task 1: AppShell publishes the content-surface geometry
**Acceptance criteria:**
- [x] Shell root carries `--app-content-left` / `--app-content-width` from the section rect.
- [x] Updated when the section resizes (sidebar expanded → collapsed, narrow); observer disconnected on unmount.
- [x] No crash without `ResizeObserver`.

**Verification:** `npm exec vitest run src/layouts/app-shell/AppShell.test.tsx`
**Files:** `AppShell.tsx`, `AppShell.test.tsx`. **Scope:** S.

## Task 2: DetailView centres on the contract; sidebar under the backdrop
**Acceptance criteria:**
- [x] Dialog `left` and `max-w` use the variables with the current values as fallback; no px offset.
- [x] Backdrop stays `fixed inset-0`, independent of the variables.
- [x] Desktop sidebar `lg:z-40`, mobile drawer keeps `z-50`.

**Verification:** `npm exec vitest run src/shared/components/detail-view/DetailView.test.tsx src/layouts/app-shell/AppSidebar.test.tsx src/shared/components/modal/nestedDialogs.test.tsx`
**Dependencies:** Task 1. **Files:** `DetailView.tsx`, `DetailView.test.tsx`, `AppSidebar.tsx`, `AppSidebar.test.tsx`. **Scope:** S.

## Checkpoint
- [x] Focused tests, eslint on changed files, typecheck, `git diff --check`.
- [x] Edge: 1440/1280 expanded + collapsed, 1100, 800, 390: dialog centre = section centre, sidebar dimmed.
- [x] Commit only the files above plus these task files.
