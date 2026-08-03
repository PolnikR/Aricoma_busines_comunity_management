# Recovery Application VM Selection

## Goal

When a recovery group is assigned to an application tier, select all of its virtual machines by default and allow the user to include or exclude individual machines without modifying the recovery group itself.

## Design

- The canonical recovery group returned by `useRecoveryGroups` remains read-only.
- The tier keeps its existing detached `recovery_group.vms` application snapshot; this array contains only the VM names selected for the application JSON.
- The builder derives the complete checkbox option list from the canonical recovery group and passes it through `TierCanvas` to `TierCard`. Selected snapshot entries missing from the latest group response remain visible by taking the union of both lists.
- Every VM is rendered as an accessible checkbox inside the existing bordered resource row. Checked rows are included in the application; unchecked rows remain visible and can be restored immediately.
- The list has its own scrollbar and a localized selected/total summary. The existing top-level clear action continues to remove the complete recovery group assignment.

## Data flow

1. Dropping a group copies all group resources into the tier snapshot.
2. Toggling a checkbox immutably adds or removes one VM from that snapshot.
3. Saving serializes only the snapshot already used by the recovery application contract.
4. No recovery-group mutation or cache update is performed.

## Error handling and accessibility

- If the group is temporarily unavailable, the application snapshot still supplies its selected VM rows.
- Native checkboxes provide keyboard interaction and expose selected state without relying on color.
- The selected count is announced as polite status text.

## Verification

- Component tests cover checked and unchecked rendering, toggle callbacks, selected counts, scrolling, and group removal.
- Builder tests prove that a VM can be excluded from the saved application while the source recovery group remains unchanged.
- Run focused tests, lint, and TypeScript checks.
