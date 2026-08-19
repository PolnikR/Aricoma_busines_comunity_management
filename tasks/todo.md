# Task List: Fix Remaining Fake/Fragile Data in Checklist Dialogs

## Task 1: Fix RecoveryApplicationsTable count mismatch and hardcoded Yes/No

**Description:** In `RecoveryApplicationsTable.tsx` (lines 338-374), the `ChecklistResultDialog`'s
`statusBar.totalCount` is hardcoded to `3`, but the `checks` array conditionally includes an
`airflowRunId` row only when `jsonViewed.airflowRunId` is truthy (line 360-364) — meaning the
array can actually be length 2. Fix by deriving both `passedCount` and `totalCount` from the real
`checks` array length, and replace hardcoded `'Yes'`/`'No'` (line 367) with `t('common.yes')`/
`t('common.no')`.

**Acceptance criteria:**
- [ ] `checks` array is built as a local variable/const before being passed to `statusBar` and `checks`, so both can reference its real length
- [ ] `statusBar.totalCount` equals `checks.length` in all cases (2 when `airflowRunId` is absent, 3 when present)
- [ ] `statusBar.passedCount` equals `checks.length` as well, since every check here is unconditionally `status: 'ok'`
- [ ] `pushToOrchestrator` detail uses `t('common.yes')` / `t('common.no')` instead of literal `'Yes'`/`'No'`

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx` (if it exists; otherwise note its absence)
- [ ] Manual check: open the Application JSON dialog for a record without an `airflowRunId` and confirm the bar reads "2 / 2 passed" with exactly 2 rows listed

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`

**Estimated scope:** Small (1 file)

---

## Task 2: Fix RecoveryApplicationRollbackResultModal mislabeled status check

**Description:** In `RecoveryApplicationRollbackResultModal.tsx` (lines 27-33), the `report.status`
check reuses the `recovery.application.rollback.resultAirflowSection` translation key ("Airflow"),
which is also used for the separate `report.airflow` check a few lines below (line 37) — so if both
`report.status` and `report.airflow` are present, two different checks display the identical label
"Airflow". Add a new, distinct translation key for the top-level status row.

**Acceptance criteria:**
- [ ] New key `recovery.application.rollback.resultStatusSection` added to `en.json`, `cs.json`, `sk.json` with a value describing the overall/top-level status (e.g. "Status" / "Stav" / "Stav")
- [ ] Line 29 of `RecoveryApplicationRollbackResultModal.tsx` uses the new key instead of `resultAirflowSection`
- [ ] The `report.airflow` check (line 37) is untouched and still uses `resultAirflowSection`

**Verification:**
- [ ] `node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json'))"` (repeat for cs.json, sk.json) confirms valid JSON
- [ ] Manual check: trigger a rollback where both `report.status` and `report.airflow` are present, confirm the two checks show different labels

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.tsx`
- `src/locales/en.json`
- `src/locales/cs.json`
- `src/locales/sk.json`

**Estimated scope:** Small (4 files, small edits)

---

## Task 3: Translate ChecklistResultDialog's Retry/Close footer buttons

**Description:** In `src/shared/components/modal/ChecklistResultDialog.tsx`, the footer buttons
hardcode `"Retry"` (line 83) and `"Close"` (line 87) in English. Translation keys `buttons.retry`
and `buttons.close` already exist in all three locale files with correct Czech/Slovak values.
Since this is the shared base component, this single fix corrects every consumer app-wide
(`ProviderConnectionTestDialog`, `RecoveryGroupRollbackResultModal`,
`RecoveryApplicationRollbackResultModal`, `RecoveryApplicationOrchestratorSuccessModal`, and the
three policy tables).

**Acceptance criteria:**
- [ ] `ChecklistResultDialog` imports and uses `useTranslation` (or receives `t` some other way consistent with how other shared components in this codebase access translations)
- [ ] Line 83's `"Retry"` literal replaced with `t('buttons.retry')`
- [ ] Line 87's `"Close"` literal replaced with `t('buttons.close')`
- [ ] No other visible text in the component changes

**Verification:**
- [ ] `npm exec vitest run src/shared/components/modal/ChecklistResultDialog.test.tsx` (if it exists; otherwise note its absence, and check whether any consumer's test snapshot needs updating)
- [ ] Manual check: switch app language to Czech, open any `ChecklistResultDialog`-based dialog, confirm Retry/Close buttons show Czech text

**Dependencies:** None

**Files likely touched:**
- `src/shared/components/modal/ChecklistResultDialog.tsx`

**Estimated scope:** Small (1 file)

---

## Task 4: Derive passedCount/totalCount from checks.length in remaining hardcoded call sites

**Description:** Four call sites hardcode `passedCount`/`totalCount` next to a `checks` array
whose length currently happens to match, the same risky pattern that caused Task 1's bug. Replace
the literals with derived values in each: `RecoveryApplicationOrchestratorSuccessModal.tsx`
(hardcoded `2, 2`, static 2-item array), `RecoveryAppPoliciesTable.tsx` (hardcoded `4, 4`),
`SnapshotPoliciesTable.tsx` (hardcoded `5, 5`), `CleanRoomPoliciesTable.tsx` (hardcoded `4, 4`) —
each of the latter three has a static, unconditional checks array of that exact length.

**Acceptance criteria:**
- [ ] All four files compute `passedCount`/`totalCount` from the real `checks` array (`checks.length` since every check in these four is unconditionally `status: 'ok'`)
- [ ] No behavior change in the currently-rendered UI (numbers stay the same today, just computed instead of literal)
- [ ] `grep -rn "passedCount: [0-9]" src/` and `grep -rn "totalCount: [0-9]" src/` return no matches anywhere in the codebase after this task

**Verification:**
- [ ] `npm exec tsc --noEmit` — no new type errors
- [ ] Manual check: open one dialog from each of the four affected components, confirm the status bar still reads the same count as before this change

**Dependencies:** None (independent of Tasks 1-3, can be done in parallel)

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`

**Estimated scope:** Small (4 files, mechanical one-line-per-file changes)

---

## Task 5: Verification and commit

**Description:** Run focused verification across all changed files, then commit. Given the
distinct nature of the fixes (real bugs vs. pure defensive cleanup), split into two commits so
Task 4's zero-behavior-change cleanup can be reverted independently of the Task 1-3 bug fixes if
ever needed.

**Acceptance criteria:**
- [ ] Commit 1 contains Tasks 1-3 (the real bug fixes + shared i18n fix)
- [ ] Commit 2 contains Task 4 (defensive hardening, no behavior change)
- [ ] All focused test/verification commands from Tasks 1-4 pass, or their absence is explicitly noted
- [ ] `git status` before each commit shows only the intended files staged

**Verification:**
- [ ] `npm exec tsc --noEmit`
- [ ] `git diff --check` on all changed locale files
- [ ] `grep -rn "passedCount: [0-9]" src/` and `grep -rn "totalCount: [0-9]" src/` both empty

**Dependencies:** Tasks 1-4

**Files likely touched:** None new (verification only)

**Estimated scope:** N/A (verification task)

---

## Task 6: Cap Modal height to desktop viewport with internal scroll

**Description:** In `src/shared/components/modal/Modal.tsx`, the dialog `div` (lines 88-100) has
no height constraint — only `max-w-2xl`/`max-w-md` for width — so content (title + children +
footer) can grow taller than the visible desktop browser window, as seen in the Application
Recovery Policy JSON dialog with 4 checks plus the JSON response body. Add `max-h-[90vh] flex
flex-col` to the outer dialog div, and wrap the `children` render in a `flex-1 min-h-0
overflow-y-auto` div so only the middle content region scrolls — the title bar and footer stay
pinned and always visible.

**Acceptance criteria:**
- [ ] Outer dialog `div` gains `max-h-[90vh]` and `flex flex-col` classes (in addition to its existing `fixed ... rounded-2xl ...` classes)
- [ ] `children` is wrapped in a new div with `flex-1 min-h-0 overflow-y-auto` so it's the only scrollable region
- [ ] Title block (`border-b`) and footer block (`border-t`) are NOT inside the scrollable wrapper — they stay visually fixed at top/bottom of the modal
- [ ] No other visual change to `Modal.tsx` (width caps, borders, backdrop, focus-trap behavior all unchanged)

**Verification:**
- [ ] `npm exec tsc --noEmit` — no new type errors
- [ ] Manual check: open the Application Recovery Policy JSON dialog at a desktop window size where content previously overflowed (e.g. resize browser to ~700px tall), confirm the modal itself never exceeds the window and the checks/JSON scroll internally while title and Close button stay visible
- [ ] Manual spot-check: open each of the other 9 `Modal` consumers (`ProvidersCreateModal`, `RecoveryGroupRollbackSuccessModal`, `SnapshotPolicyModal`, `CleanRoomPolicyModal`, `RecoveryAppPolicyModal`, `PolicySetModal`, `PlatformProvidersModal`, `DataTableToolbar`, `CredentialCreateModal`) and confirm no visual regression, and specifically that any dropdown/select field is not clipped when opened near the modal's bottom edge

**Dependencies:** None (independent of Tasks 1-5)

**Files likely touched:**
- `src/shared/components/modal/Modal.tsx`

**Estimated scope:** Small (1 file, plus manual verification across 10 consumers)
