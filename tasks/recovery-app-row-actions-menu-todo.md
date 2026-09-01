# Task Checklist: Row Actions Menu for Recovery Applications

## Shared menu component

- [x] Move `RecoveryGroupContextMenu.tsx` to `src/shared/components/data-table/RowActionsMenu.tsx`.
- [x] Rename the component to `RowActionsMenu` and its props to `RowActionsMenuProps`, keeping every prop identical.
- [x] Move the test file to `src/shared/components/data-table/RowActionsMenu.test.tsx` and update only the import and name.
- [x] Export `RowActionsMenu` from `src/shared/components/data-table/index.ts`.
- [x] Delete the old feature-local context menu file.

## Recovery Groups table

- [x] Import `RowActionsMenu` from `@/shared/components/data-table`.
- [x] Set the `actions` column header to `t('tables.recoveryGroups.actions')`.
- [x] Leave Edit / Delete / Roll back behaviour untouched.
- [x] Confirm existing delete, rollback, and unresolved-provider tests still pass.

## Recovery Applications table

- [x] Add `openMenuId` state and a `triggerRefForMenu` ref resolved via `useEffect`.
- [x] Add the `actions` column with header `t('tables.recovery.actions')` and a `⋯` ghost trigger button.
- [x] Tag the trigger with `data-recovery-application-menu-trigger={app.id}` and stop row-click propagation.
- [x] Render `RowActionsMenu` with Edit and Delete only; omit the `rollback` prop.
- [x] Wire Edit to `onEdit(app.id)` and clear the selected row.
- [x] Wire Delete to `setDeleteTarget(app)` so the existing `ConfirmDialog` handles it.
- [x] Set the menu `aria-label` from the actions label and the application name.
- [x] Close the menu after a successful delete.
- [x] Add tests: menu opens without selecting the row, Edit dispatches `onEdit`, Delete opens the confirm dialog, no rollback item is rendered.

## Translations

- [x] Add `tables.recovery.actions` to `en.json`, `cs.json`, `sk.json`.
- [x] Add the missing `tables.recoveryGroups.actions` to the same three files.
- [x] Verify no other locale entry changed.

## Focused verification

- [x] Run `RowActionsMenu.test.tsx`.
- [x] Run `RecoveryGroupsTable.test.tsx`.
- [x] Run `RecoveryApplicationsTable.test.tsx`.
- [x] Run `src/locales/recoveryRollbackTranslations.test.ts`.
- [x] Run focused ESLint on the changed TypeScript files.
- [x] Run `git diff --check` and inspect only the scoped files.
- [x] Confirm `rg -n "RecoveryGroupContextMenu" src` returns nothing.
- [ ] Manually verify `⋯` → Edit and `⋯` → Delete on the Recovery Applications list.
- [ ] Commit the change atomically.

Complete test suite and production build are intentionally not run.

Deviation from the plan: `onEdit` and `onDelete` are optional props on
`RecoveryApplicationsTable`, so the `actions` column and its menu render only when
`onDelete` is supplied (Delete cannot be suppressed inside `RowActionsMenu`), and the
Edit item is disabled when `onEdit` is missing. This avoids a menu entry that would do
nothing. The list page supplies both handlers, so the production UI is unaffected.
