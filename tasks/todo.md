# Task Checklist: Add Loading State to Rollback Button

## Phase 1: Update Rollback Button

- [ ] **Task 1: Update rollback button to show loading state**
  - [ ] Modify RecoveryGroupContextMenu button rendering
  - [ ] When `isRollingBack=true`: show text "Rolling back" and `disabled=true`
  - [ ] When `isRollingBack=false`: show text "Roll back" and `disabled=false`
  - [ ] Button remains disabled during entire API call
  - [ ] After API responds, button returns to normal state

## Verification

- [ ] Run test suite: `npm test` ✓ All tests pass
- [ ] Build succeeds: `npm run build` ✓ No errors
- [ ] Manual verification:
  - [ ] Click "Roll back" button
  - [ ] Button text changes to "Rolling back"
  - [ ] Button is disabled
  - [ ] After API responds, result modal appears

## Checkpoint: Complete

- [ ] All changes committed
- [ ] Ready for merge
