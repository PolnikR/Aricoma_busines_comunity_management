# Recovery Groups Refresh Design

## Goal

Add the existing shared page-level refresh control to the Recovery Groups list so users can reload recovery groups without leaving the page.

## UI Design

Recovery Groups will continue to use the shared `TableToolbar`. The page will pass the existing `isFetching` and `onRefresh` props, placing the existing shared `Refresh` button in the header next to `Create Recovery Group` and showing the shared `Updating` indicator while a request is in progress.

No new component, button variant, translation, or layout wrapper will be introduced.

## Data Flow

1. The user activates the shared `Refresh` button.
2. `TableToolbar` invokes the callback supplied by `RecoveryGroupsListPage`.
3. The callback invokes the existing `refresh()` function returned by `useRecoveryGroups`.
4. The existing query refreshes the provider-dependent Recovery Groups data.
5. The existing `isFetching` value drives the shared updating indicator.

## Error and Empty States

The refresh control remains in the page header in populated, empty, and request-error states. Existing table retry behavior and error messages remain unchanged.

## Testing

Extend `RecoveryGroupsListPage.test.tsx` with a focused interaction test that renders the page with a mocked `useRecoveryGroups`, clicks the shared `Refresh` button, and verifies that `refresh()` is called once. Existing loading, empty-state, table, deletion, and rollback behavior must remain unchanged.

## Scope

- Modify `RecoveryGroupsListPage.tsx` to connect the existing shared toolbar props.
- Modify `RecoveryGroupsListPage.test.tsx` to cover the refresh action.
- Do not create shared or feature components.
- Preserve unrelated uncommitted Recovery Groups changes already present in the working tree.
