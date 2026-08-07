# Task Checklist: Fix Context Menu Bug, Shared Spinner, Code Review

## Phase 1: Fix Broken Edit/Delete

- [ ] **Task 1: Remove duplicate context-menu render block**
  - [ ] Delete the `!currentMenuGroup.pushToOrchestrator` block (dead menu without `rollback` prop) in RecoveryGroupsTable.tsx
  - [ ] Keep the single remaining block (with `rollback` prop) as the only menu
  - [ ] Manual check: Edit works when `pushToOrchestrator = false`
  - [ ] Manual check: Delete works when `pushToOrchestrator = false`
  - [ ] Manual check: rollback still disabled/enabled correctly

## Phase 2: Shared Spinner Component

- [ ] **Task 2: Create shared `Spinner` component**
  - [ ] New file `src/shared/components/spinner/Spinner.tsx`
  - [ ] Extract exact markup/classes from RecoveryGroupBuilder's inline spinner
  - [ ] Accept optional `className` override

- [ ] **Task 3: Use `Spinner` in RecoveryGroupBuilder.tsx**
  - [ ] Replace inline spinner span with `<Spinner />`
  - [ ] Visual check: no change in appearance

- [ ] **Task 4: Add spinner to ConfirmDialog (rollback)**
  - [ ] Add `Spinner` next to `loadingLabel` text when `isLoading`
  - [ ] Manual: Roll back confirm → spinner + "Rolling back..." shows

- [ ] **Task 5: Add spinner to remaining save buttons**
  - [ ] RecoveryAppBuilder.tsx save button
  - [ ] PolicySetModal.tsx submit button
  - [ ] SnapshotPolicyModal.tsx submit button

## Checkpoint: Phases 1–2

- [ ] Run test suite: `npm test` ✓ All tests pass
- [ ] Build succeeds: `npm run build` ✓ No errors
- [ ] Manual: edit/delete work in every menu state
- [ ] Manual: all 5 save/confirm flows show spinner + text while pending

## Phase 3: Code Review

- [ ] **Task 6: Review commits differing from `test` branch**
  - [ ] Diff scope: `origin/test...HEAD` (14 commits, merge base `9562e06`)
  - [ ] Apply five-axis review (correctness, readability, architecture, security, performance)
  - [ ] Label findings by severity
  - [ ] Report findings before making further changes

## Checkpoint: Complete

- [ ] All changes committed
- [ ] Code review report delivered
- [ ] Ready for merge
