# Recovery Group Delete Rollback Warning Plan

## Goal

When deleting a Recovery Group with `pushToOrchestrator === true`, inform the
user that Airflow and IBM FlashCopy resources will be rolled back before the
group is permanently deleted.

## Implementation

1. Add a failing UI test for the orchestrated delete warning.
2. Select the delete message from `deleteTarget.pushToOrchestrator`.
3. Add the rollback-aware message in English, Slovak and Czech.
4. Preserve and test the existing message for non-orchestrated groups.

## Acceptance criteria

- Orchestrated delete explicitly warns about automatic rollback.
- Regular delete keeps the existing generic warning.
- The actual delete/rollback behavior remains unchanged.
- Focused Recovery Groups tests and typecheck pass.

## Risk control

The warning uses the same `pushToOrchestrator` value that is passed with the
selected group to the existing delete mutation, so the message and execution
branch cannot diverge in the table component.
