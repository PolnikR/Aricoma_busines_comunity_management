# Recovery Groups Refresh Implementation Plan

> **For agentic workers:** Execute the steps in order and verify each checkpoint.

**Goal:** Connect Recovery Groups to the existing shared `TableToolbar` refresh control.

**Architecture:** `RecoveryGroupsListPage` will pass the already available `isFetching` and `refresh` values to `TableToolbar` through `isFetching` and `onRefresh`. No new component, API, translation, or button variant is needed.

**Tech Stack:** React, React Router, TanStack Query, Vitest, Testing Library, existing Tailwind design tokens.

## Global Constraints

- Reuse `src/shared/components/table/TableToolbar.tsx` unchanged.
- Preserve existing Recovery Groups loading, empty, error, delete, rollback, and navigation behavior.
- Do not stage or modify unrelated work already present in the working tree.

## Task 1: Add the failing page interaction test

**Files:** `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx`

- [x] Render the page with the existing providers and a controlled fetch mock.
- [x] Click the shared button named `Refresh`.
- [x] Assert that the existing recovery-groups endpoint is fetched once more.
- [x] Run the focused test and confirm it fails before the page provides `onRefresh`.

## Task 2: Wire the existing shared toolbar

**Files:** `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`

- [x] Add `isFetching={isFetching}` to `TableToolbar`.
- [x] Add `onRefresh={() => { void refresh() }}` to the same toolbar.
- [x] Leave the existing create action and all table retry callbacks unchanged.

## Task 3: Verify the focused slice

- [x] Run the Recovery Groups page, hook, API, and table tests with one worker: 19 files and 112 tests passed.
- [x] Run TypeScript checking and ESLint for the changed Recovery Groups files.
- [x] Run `git diff --check`; no files were staged or committed.

## Acceptance Criteria

- The Recovery Groups header shows the existing shared `Refresh` button beside the create action.
- Clicking it invokes the existing `refresh()` callback once.
- The shared `Updating` indicator is driven by `isFetching`.
- No new shared component or API behavior is introduced.
