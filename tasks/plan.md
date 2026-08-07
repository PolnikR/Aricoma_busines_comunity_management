# Implementation Plan: Remove Status Column from Recovery Groups Table

## Overview

Delete the STATUS column from the recovery groups table. The status badge (Active/Draft) is derived from resource count and is not needed in the UI.

## Architecture Decisions

- **Remove status column only:** Delete the STATUS column definition (lines 150-157) from RecoveryGroupsTable.tsx
- **Keep other columns intact:** ORCHESTRATION column and all other functionality remains unchanged
- **No logic changes:** This is purely a UI/display change

## Task List

### Phase 1: Remove Status Column

**Task 1: Delete STATUS column from table**

Remove the status column definition from the columns array in RecoveryGroupsTable.tsx (lines 150-157).

**Acceptance criteria:**
- [ ] STATUS column removed from table definition
- [ ] Table renders correctly with remaining columns
- [ ] No console errors or missing references

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: STATUS column no longer visible in table

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`

**Estimated scope:** XS (remove 8 lines)

### Checkpoint: Complete
- [ ] All tests pass
- [ ] Build succeeds without errors
- [ ] STATUS column removed from table
- [ ] Ready to merge

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Column references elsewhere | Very Low | Status column is only in UI definition, not used in filters or logic |

## Open Questions

None.
