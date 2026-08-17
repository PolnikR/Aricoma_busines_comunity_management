# Remove Duplicate Tier Recovery Group Label Design

## Goal

Show the assigned recovery group label only once in a recovery application tier
card. The label in the tier header remains; the duplicate label inside the
drag-and-drop zone is removed.

## UI Change

`TierCard` will stop passing the assigned recovery group name as the
`ResourceSelectionCard` title. The drag-and-drop zone will continue to show:

- the recovery group description;
- the assigned virtual machines;
- the clear `×` button;
- the existing drag-and-drop interaction.

To preserve the clear button without a visible title, `ResourceSelectionCard`
will render its header area when either a title or a clear action exists. The
heading itself remains conditional on a non-empty title.

## Behavior and Accessibility

No data, state, callback, translation, or drag-and-drop behavior changes. The
clear button keeps its current accessible label, tooltip, focus treatment, and
position at the top right of the selection area.

## Verification

- Update the tier-card test to verify the assigned recovery group label appears
  exactly once.
- Verify the clear button remains available and functional.
- Run the focused `TierCard` and `ResourceSelectionCard` tests.
- Run type checking and linting.
