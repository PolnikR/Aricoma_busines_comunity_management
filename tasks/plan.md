# Implementation Plan: Add Loading State to Rollback Button

## Overview

Improve UX by showing loading state on the rollback button while waiting for API response. When user clicks the rollback button in the context menu, change the button text to "Rolling back" and disable it until the API responds. Then show the result modal.

## Architecture Decisions

- **No new components:** Use existing context menu button state
- **Button feedback:** Text changes to "Rolling back" and button becomes disabled during API call
- **State tracking:** Use existing `isRollingBack` state variable
- **Simple feedback:** Just the button change - no additional modals

## Task List

### Phase 1: Update Rollback Flow

**Task 1: Update rollback button to show loading state**

Modify the rollback button in RecoveryGroupContextMenu to:
1. Show "Rolling back" text while `disabled=true` and `isRollingBack=true`
2. Keep the button disabled during API call
3. Return to normal state when API responds

**Acceptance criteria:**
- [ ] Rollback button text changes to "Rolling back" when clicked
- [ ] Button is disabled during API call
- [ ] Button re-enables after API response
- [ ] Result modal appears after loading completes

**Verification:**
- [ ] Manual: Click rollback → button shows "Rolling back" → button disabled → result modal appears
- [ ] No button visible state flashing

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupContextMenu.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`

**Estimated scope:** XS (update button rendering logic)

### Checkpoint: Complete
- [ ] All tests pass
- [ ] Build succeeds without errors
- [ ] Button shows loading state during API call
- [ ] Ready to merge

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Button text truncation | Low | Text "Rolling back" fits in button |
| User confusion | Low | Text clearly indicates action is in progress |

## Open Questions

None — requirements are clear.
