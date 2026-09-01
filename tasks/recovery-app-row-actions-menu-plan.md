# Implementation Plan: Row Actions Menu for Recovery Applications

## Overview

The Recovery Applications list table gets the same per-row context menu that the Recovery Groups table already has, plus a visible `Actions` column header. The menu component itself moves out of the `recovery-groups` feature into `src/shared/components/data-table` as a feature-neutral `RowActionsMenu`, so both tables consume one implementation instead of a copy.

Recovery Applications expose **Edit** and **Delete** only. There is no standalone rollback endpoint for applications — the OpenAPI contract has `/rollback_group_from_orchestrator` for groups only, and application rollback happens exclusively as part of `DELETE /delete_recovery_app` with `rollback_from_orchestrator: true`. The existing delete confirmation flow already covers that, so the menu's Delete item reuses it unchanged.

## Confirmed Decisions

- Recovery Applications menu items: **Edit + Delete**. No rollback item, not even a disabled one.
- The `Actions` column header is added to **both** tables. Recovery Groups currently renders an empty header for its `actions` column.
- The menu component is **moved to shared**, not duplicated and not imported cross-feature.
- The menu's public props stay exactly as they are today (`triggerRef`, `open`, `onClose`, `ariaLabel`, `editLabel`, `editDisabled`, `editDisabledTitle`, `deleteLabel`, `edit`, `delete`, optional `rollback`). Only the component name and file location change.
- `tables.recoveryGroups.actions` is already referenced at `RecoveryGroupsTable.tsx:336` but **does not exist** in `en.json`, `cs.json`, or `sk.json`. This plan adds it alongside the new `tables.recovery.actions`.

## Architecture Decisions

- **Destination `src/shared/components/data-table/RowActionsMenu.tsx`.** The component is a table-row concern and every other table primitive already lives there; it is exported from the existing `data-table/index.ts` barrel so consumers import from `@/shared/components/data-table` like they do for `DataTable` and `DetailDrawer`.
- **Move, don't wrap.** The old `RecoveryGroupContextMenu` file is deleted rather than left as a re-export shim — it has exactly one consumer, so a compatibility alias would be dead code.
- **Props unchanged.** Making `rollback` optional was already part of the API, so Recovery Applications simply omits it. No new "variant" or "items array" abstraction is introduced.
- **Delete goes through the existing dialog.** The menu's `delete` callback only sets `deleteTarget`; the existing `ConfirmDialog` + `useDeleteRecoveryApplication` + `RecoveryApplicationRollbackResultModal` chain is untouched, which keeps orchestrated-app rollback reporting working for free.
- **Trigger lookup mirrors the group table.** A `data-recovery-application-menu-trigger={app.id}` attribute plus a `useEffect` that resolves the button into `triggerRefForMenu` — the same mechanism, because the menu positions itself against a live DOM node.

## Dependency Flow

```text
Task 1: move menu to shared/data-table (RowActionsMenu + barrel export)
                 |
        +--------+--------+
        |                 |
        v                 v
Task 2: groups     Task 3: applications
 table switches     table adds actions
 to RowActionsMenu   column + menu
        |                 |
        +--------+--------+
                 |
                 v
        Task 4: translations (en/cs/sk)
                 |
                 v
        Task 5: focused verification
```

Task 4 is listed after the UI tasks because the new keys are consumed by them, but it may be done first — the tables will render the raw key until it lands, so tests in Tasks 2 and 3 assert against the translated string and therefore need Task 4 in place before they pass. Implement Task 4 alongside Task 2 if convenient.

## Task 1: Move the Context Menu into `shared/components/data-table`

**Description:** Move `RecoveryGroupContextMenu.tsx` to `src/shared/components/data-table/RowActionsMenu.tsx`, rename the component and its props interface (`RowActionsMenuProps`), and export both from the `data-table` barrel. Move the accompanying test file the same way. No behavioural change: positioning, portal rendering, outside-pointer/Escape close handling, and the optional `rollback` item all stay as they are.

**Acceptance criteria:**

- [ ] `src/shared/components/data-table/RowActionsMenu.tsx` exists and `RecoveryGroupContextMenu.tsx` is deleted.
- [ ] `RowActionsMenu` is exported from `src/shared/components/data-table/index.ts`.
- [ ] The component's props are identical to the previous ones apart from the interface name.
- [ ] The moved test file passes unchanged apart from the import path and component name.

**Verification:**

- [ ] `npm exec vitest run src/shared/components/data-table/RowActionsMenu.test.tsx`
- [ ] `rg -n "RecoveryGroupContextMenu" src` returns no matches after Task 2.

**Dependencies:** None.

**Files likely touched:**

- `src/shared/components/data-table/RowActionsMenu.tsx` (moved from `src/features/recovery-plans/recovery-groups/components/RecoveryGroupContextMenu.tsx`)
- `src/shared/components/data-table/RowActionsMenu.test.tsx` (moved from the matching test)
- `src/shared/components/data-table/index.ts`

**Estimated scope:** Small (3 files).

## Task 2: Point the Recovery Groups Table at the Shared Menu and Label Its Column

**Description:** Update `RecoveryGroupsTable` to import `RowActionsMenu` from `@/shared/components/data-table` and give its `actions` column the header `t('tables.recoveryGroups.actions')` instead of the current empty string. All existing group behaviour — Edit disabling for unresolved providers, Delete, Roll back with its disabled state and tooltip — stays exactly as it is.

**Acceptance criteria:**

- [ ] The groups table renders the shared `RowActionsMenu`; no import from a local context-menu file remains.
- [ ] The `actions` column header renders the localized `Actions` label instead of an empty cell.
- [ ] Edit / Delete / Roll back behaviour, including the unresolved-provider edit block and the rollback disabled title, is unchanged.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- [ ] Existing rollback and delete tests (`shows the rollback report after a standalone rollback`, `edits and confirms deletion from the detail panel`, `keeps unresolved groups visible and disables only unsafe editing`) still pass without modification.

**Dependencies:** Task 1, and Task 4 for the header assertion.

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx` (only if a header assertion is added)

**Estimated scope:** Small (2 files).

## Checkpoint: Shared Menu in Place

- [ ] `RowActionsMenu` lives in `shared/components/data-table` and is exported from the barrel.
- [ ] Recovery Groups renders identically to before, except the `Actions` header is now visible.
- [ ] Menu and groups-table focused tests pass.

## Task 3: Add the Actions Column and Row Menu to Recovery Applications

**Description:** Add an `actions` column to `RecoveryApplicationsTable` with the header `t('tables.recovery.actions')`. Its cell renders a `⋯` ghost `Button` carrying `data-recovery-application-menu-trigger={app.id}` that toggles an `openMenuId` state and stops row-click propagation. When a menu is open, render `RowActionsMenu` with **Edit and Delete only**: `edit` calls `onEdit(app.id)` and clears the selected row, `delete` sets `deleteTarget` so the existing `ConfirmDialog` handles it. When `onEdit` or `onDelete` is not supplied by the page, the corresponding entry is suppressed or disabled rather than rendering a no-op. Close the menu after a successful delete, mirroring the groups table.

**Acceptance criteria:**

- [ ] The applications table has an `Actions` column whose cell is a `⋯` trigger button.
- [ ] Clicking the trigger opens the menu and does **not** open the row detail drawer.
- [ ] The menu contains Edit and Delete; it contains no rollback item.
- [ ] Edit invokes `onEdit` with the application id and closes both the menu and the drawer selection.
- [ ] Delete opens the existing delete confirmation dialog for that application, and confirming it still surfaces `RecoveryApplicationRollbackResultModal` for orchestrated applications.
- [ ] The menu's `aria-label` identifies the application by name.
- [ ] Existing search, filtering, pagination, JSON viewer, and detail drawer behaviour is unchanged.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- [ ] New tests cover: opening the menu without selecting the row, Edit dispatching `onEdit`, Delete opening the confirm dialog, and the absence of a rollback menu item.
- [ ] Manual check: open the Recovery Applications list, use `⋯` → Edit and `⋯` → Delete on one application.

**Dependencies:** Task 1, and Task 4 for the header and aria-label assertions.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`

**Estimated scope:** Small (2 files).

## Task 4: Add the `Actions` Translations

**Description:** Add `tables.recovery.actions` to all three locale files, and add the already-referenced but missing `tables.recoveryGroups.actions`. The locale files use flat dotted keys; insert each new key next to its sibling `tables.*` keys.

**Acceptance criteria:**

- [ ] `tables.recovery.actions` exists in `en.json` (`Actions`), `cs.json` (`Akce`), and `sk.json` (`Akcie`).
- [ ] `tables.recoveryGroups.actions` exists in all three files with the same values.
- [ ] No other locale entry is modified, reordered, or re-encoded.

**Verification:**

- [ ] `node -e "['en','cs','sk'].forEach(l=>{const d=require('./src/locales/'+l+'.json');['tables.recovery.actions','tables.recoveryGroups.actions'].forEach(k=>{if(!d[k])throw new Error(l+' missing '+k)})});console.log('ok')"`
- [ ] `npm exec vitest run src/locales/recoveryRollbackTranslations.test.ts`
- [ ] `git diff --stat src/locales` shows only the intended additions.

**Dependencies:** None.

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/cs.json`
- `src/locales/sk.json`

**Estimated scope:** Small (3 files).

## Checkpoint: Applications Menu Working

- [ ] `⋯` menu is present on every Recovery Applications row.
- [ ] Edit and Delete work through the menu and through the detail drawer.
- [ ] `Actions` header is localized in all three languages in both tables.

## Task 5: Focused Verification

**Description:** Run the focused test scope for every touched area, lint the changed TypeScript files, and inspect the diff for accidental edits outside the listed files.

**Acceptance criteria:**

- [ ] All focused tests pass.
- [ ] ESLint reports no new problems for the changed files.
- [ ] The diff touches only the files listed in Tasks 1–4.

**Verification:**

- [ ] `npm exec vitest run src/shared/components/data-table/RowActionsMenu.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/locales/recoveryRollbackTranslations.test.ts`
- [ ] `npm exec eslint src/shared/components/data-table/RowActionsMenu.tsx src/shared/components/data-table/index.ts src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- [ ] `git diff --check`
- [ ] `rg -n "RecoveryGroupContextMenu" src` returns nothing.

**Dependencies:** Tasks 1–4.

**Files likely touched:** None beyond Tasks 1–4 unless verification exposes a defect in them.

**Estimated scope:** Small verification task.

## Final Checkpoint

- [ ] One menu implementation serves both tables.
- [ ] Recovery Applications rows expose Edit and Delete through the `⋯` menu.
- [ ] Both tables show a localized `Actions` header.
- [ ] Focused tests and focused lint pass; the complete suite and production build are **not** run unless requested.
- [ ] Changes are committed as one atomic commit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Moving the menu breaks the groups rollback flow | High | Move without touching behaviour or props; the existing group rollback and delete tests are the regression gate. |
| Trigger button click also opens the row detail drawer | Medium | `event.stopPropagation()` in the trigger handler, asserted by a test, exactly as the groups table does. |
| Menu stays open after a delete completes | Low | Clear `openMenuId` in the delete success path, mirroring `RecoveryGroupsTable`. |
| A locale file loses non-ASCII characters on rewrite | Medium | Edit the JSON files in place with targeted edits; verify with `git diff --stat` that only the new lines appear. |
| Someone later expects a rollback item on applications | Low | Documented in this plan: no application rollback endpoint exists; rollback runs only inside delete. |

## Out of Scope

- Adding a standalone rollback endpoint or rollback menu item for Recovery Applications.
- Changing the detail drawer footer buttons in either table.
- Changing the delete/rollback API contract or `useDeleteRecoveryApplication` logic.
- Refactoring other feature tables to use `RowActionsMenu`.
- Keyboard arrow-key navigation inside the menu (not present today for groups either).

## Open Questions

None. Menu contents, column placement, and component location were confirmed before planning.
