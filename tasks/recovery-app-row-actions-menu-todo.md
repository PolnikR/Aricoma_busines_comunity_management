# Task Checklist: Row Actions Menu for Recovery Applications

## Shared menu component

- [ ] Move `RecoveryGroupContextMenu.tsx` to `src/shared/components/data-table/RowActionsMenu.tsx`.
- [ ] Rename the component to `RowActionsMenu` and its props to `RowActionsMenuProps`, keeping every prop identical.
- [ ] Move the test file to `src/shared/components/data-table/RowActionsMenu.test.tsx` and update only the import and name.
- [ ] Export `RowActionsMenu` from `src/shared/components/data-table/index.ts`.
- [ ] Delete the old feature-local context menu file.

## Recovery Groups table

- [ ] Import `RowActionsMenu` from `@/shared/components/data-table`.
- [ ] Set the `actions` column header to `t('tables.recoveryGroups.actions')`.
- [ ] Leave Edit / Delete / Roll back behaviour untouched.
- [ ] Confirm existing delete, rollback, and unresolved-provider tests still pass.

## Recovery Applications table

- [ ] Add `openMenuId` state and a `triggerRefForMenu` ref resolved via `useEffect`.
- [ ] Add the `actions` column with header `t('tables.recovery.actions')` and a `⋯` ghost trigger button.
- [ ] Tag the trigger with `data-recovery-application-menu-trigger={app.id}` and stop row-click propagation.
- [ ] Render `RowActionsMenu` with Edit and Delete only; omit the `rollback` prop.
- [ ] Wire Edit to `onEdit(app.id)` and clear the selected row.
- [ ] Wire Delete to `setDeleteTarget(app)` so the existing `ConfirmDialog` handles it.
- [ ] Set the menu `aria-label` from the actions label and the application name.
- [ ] Close the menu after a successful delete.
- [ ] Add tests: menu opens without selecting the row, Edit dispatches `onEdit`, Delete opens the confirm dialog, no rollback item is rendered.

## Translations

- [ ] Add `tables.recovery.actions` to `en.json`, `cs.json`, `sk.json`.
- [ ] Add the missing `tables.recoveryGroups.actions` to the same three files.
- [ ] Verify no other locale entry changed.

## Focused verification

- [ ] Run `RowActionsMenu.test.tsx`.
- [ ] Run `RecoveryGroupsTable.test.tsx`.
- [ ] Run `RecoveryApplicationsTable.test.tsx`.
- [ ] Run `src/locales/recoveryRollbackTranslations.test.ts`.
- [ ] Run focused ESLint on the changed TypeScript files.
- [ ] Run `git diff --check` and inspect only the scoped files.
- [ ] Confirm `rg -n "RecoveryGroupContextMenu" src` returns nothing.
- [ ] Manually verify `⋯` → Edit and `⋯` → Delete on the Recovery Applications list.
- [ ] Commit the change atomically.

Complete test suite and production build are intentionally not run.
