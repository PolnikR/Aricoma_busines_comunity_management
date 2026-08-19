# Implementation Plan: Fix Remaining Fake/Fragile Data in Checklist Dialogs

## Overview

Following the earlier fix to the three recovery-policy JSON dialogs, a full codebase audit
checked every other JSON-viewer / checklist-style dialog for the same bug class: a status bar
whose "N / N passed" count doesn't match what's actually rendered below it. Most dialogs
(`JsonViewerModal` usages, `ProviderConnectionTestDialog`, `RecoveryGroupRollbackResultModal`)
were already correct. Three issues remain, of two different severities:

1. A **real, currently-reproducible bug** in `RecoveryApplicationsTable.tsx`: `totalCount` is
   hardcoded to `3`, but the `checks` array conditionally drops to 2 items when
   `jsonViewed.airflowRunId` is absent — so the bar can show "3/3 passed" while only 2 rows render.
2. A **real mislabeling bug** in `RecoveryApplicationRollbackResultModal.tsx`: the `report.status`
   check reuses the `resultAirflowSection` ("Airflow") translation key, which is also used for the
   separate `report.airflow` check — so two different checks can show the identical label.
3. A **missing-translation bug** in the shared `ChecklistResultDialog.tsx` itself: the footer
   "Retry"/"Close" buttons are hardcoded English literals, even though `buttons.retry` and
   `buttons.close` already exist as translation keys — meaning every dialog built on this shared
   component has never shown a translated Retry/Close button in Czech or Slovak.

Additionally, as defensive cleanup (not a live bug today, but the same pattern that caused issue
#1), four other call sites hardcode `passedCount`/`totalCount` next to a checks array whose length
happens to match today: `RecoveryApplicationOrchestratorSuccessModal.tsx` and the three
already-fixed policy tables (`RecoveryAppPoliciesTable.tsx`, `SnapshotPoliciesTable.tsx`,
`CleanRoomPoliciesTable.tsx`). These get switched to `checks.length` so a future edit to a checks
array can't silently desync the count again.

## Architecture Decisions

- **No structural changes to `ChecklistResultDialog`'s props/contract** — only its two hardcoded
  button labels change to `t(...)` calls, using translation keys that already exist app-wide.
- **`passedCount`/`totalCount` are always derived, never hardcoded**, going forward — this is the
  one rule that would have prevented every issue found in the audit (the original bug and this
  round). Every touched call site is being brought in line with this rule.
- **`RecoveryApplicationRollbackResultModal`'s mislabel needs one new translation key** since no
  existing key distinctly describes the top-level `report.status` field (as opposed to the
  `report.airflow` sub-section). New key: `recovery.application.rollback.resultStatusSection`,
  added to `en.json`/`cs.json`/`sk.json` following the existing pattern for that file.
- **`RecoveryApplicationsTable`'s Yes/No fix reuses `common.yes`/`common.no`**, matching the
  pattern already used correctly in the just-fixed `CleanRoomPoliciesTable.tsx` — no new keys
  needed there.

## Task List

### Phase 1: Real bugs (user-visible incorrect behavior today)

- [ ] Task 1: Fix `RecoveryApplicationsTable.tsx` count mismatch and hardcoded Yes/No
- [ ] Task 2: Fix `RecoveryApplicationRollbackResultModal.tsx` mislabeled status check

### Checkpoint: Real bugs fixed
- [ ] Both dialogs show a status bar count that always matches the rendered checks list
- [ ] The two `report.status` / `report.airflow` rows in the rollback modal show distinct labels

### Phase 2: Shared component i18n gap

- [ ] Task 3: Translate `ChecklistResultDialog.tsx`'s Retry/Close footer buttons

### Checkpoint: Shared dialog fully translated
- [ ] Switching the app language to Czech or Slovak shows translated Retry/Close text in every
      dialog built on `ChecklistResultDialog` (spot-check 2-3 call sites)

### Phase 3: Defensive hardening (no active bug, same risk pattern)

- [ ] Task 4: Derive `passedCount`/`totalCount` from `checks.length` in the four remaining
      hardcoded call sites (`RecoveryApplicationOrchestratorSuccessModal.tsx`,
      `RecoveryAppPoliciesTable.tsx`, `SnapshotPoliciesTable.tsx`, `CleanRoomPoliciesTable.tsx`)

### Checkpoint: All checklist dialogs hardened
- [ ] `grep` for `passedCount: [0-9]` / `totalCount: [0-9]` across `src/` returns no matches
- [ ] Focused tests pass; commit created

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| New translation key added for Task 2 must go in all three locale files or the app's en/cs/sk symmetry breaks | Medium | Add to all three in the same task, verify with grep before commit |
| Task 1's Yes/No fix changes visible English text only in the sense of routing through i18n; if `common.yes`/`common.no` values ever differ from literal "Yes"/"No" the English rendering doesn't change (both are "Yes"/"No" today) | Low | Verified existing `common.yes`/`common.no` values equal "Yes"/"No" in en.json before relying on them |
| Task 4 touches 4 files with no functional bug present — risk of introducing a regression for zero user-visible benefit | Low | Change is mechanical (`checks.length` / `checks.filter(...).length` in place of a literal); keep as its own commit so it can be reverted independently of Phase 1/2 if desired |

## Open Questions

- None. All three real/near-bugs and the four hardening sites were identified precisely in the
  audit, with exact file and line references confirmed by direct file reads.

---

## Addendum: Cap Modal Height to Desktop Viewport

### Overview

The shared `Modal.tsx` (`src/shared/components/modal/Modal.tsx`) has no viewport-height
constraint today — the dialog is centered via `fixed left-1/2 top-1/2 ... -translate-x-1/2
-translate-y-1/2` with only a `max-w-2xl`/`max-w-md` width cap, and its content (title + children
+ footer) can grow taller than the visible desktop window. This is visible in the Application
Recovery Policy JSON dialog: with 4 checks plus the response-body JSON viewer, the modal can
exceed a shorter desktop browser window, pushing the footer or content out of view with no way to
scroll to it.

Fix: cap the dialog's total height to a fraction of the viewport (`max-h-[90vh]`) and make the
middle content region scroll internally, while the title bar and footer stay pinned in place —
the standard "sticky header/footer, scrollable body" modal pattern.

### Architecture Decisions

- **Change lives entirely in `Modal.tsx`**, the single shared shell — no changes needed in
  `ChecklistResultDialog` or any of the 10 components that use `Modal` directly (see below), since
  none of them currently set their own height/overflow handling that would conflict.
- **`max-h-[90vh]` on the outer dialog `div`**, with `flex flex-col` so title/children/footer stack
  vertically and the height cap can be distributed between them.
- **Only the `children` region scrolls** (`overflow-y-auto` on a wrapping div, `flex-1 min-h-0` so
  it shrinks correctly inside the flex column) — the title bar and footer are never clipped or
  scrolled away, matching the existing visual pattern where they're visually pinned by borders
  (`border-b`, `border-t`).
- **10 existing consumers of `Modal`** are affected by this shared change:
  `ChecklistResultDialog`, `ProvidersCreateModal`, `RecoveryGroupRollbackSuccessModal`,
  `SnapshotPolicyModal`, `CleanRoomPolicyModal`, `RecoveryAppPolicyModal`, `PolicySetModal`,
  `PlatformProvidersModal`, `DataTableToolbar`, `CredentialCreateModal`. None were found to render
  their own dropdown/popover content that depends on the modal body overflowing visibly (checked
  `ProvidersCreateModal` as a representative form modal — no absolute-positioned dropdown found),
  but this needs a manual spot-check per Task 6 below since `overflow-y-auto` can clip a
  non-portaled dropdown menu if one exists in a form modal.
- **No new "automated" sizing logic (JS-measured viewport, ResizeObserver, etc.)** — a CSS
  `vh`-based max-height is the standard, zero-JS way to keep a fixed-position modal within the
  desktop viewport, and matches the complexity level of the rest of `Modal.tsx` (no existing
  runtime size calculations to extend).

### Task List

- [ ] Task 6: Cap `Modal.tsx` height to viewport with internal scroll, spot-check all 10 consumers

### Checkpoint: Modal fits desktop viewport
- [ ] The Application Recovery Policy JSON dialog (and Snapshot/Clean Room equivalents) never
      exceeds the visible browser window at common desktop sizes (1366x768 through 1920x1080),
      with the checks list and JSON response scrolling internally instead
- [ ] Title bar and footer buttons (Retry/Close, Save/Cancel, etc.) remain visible and unscrolled
      in every one of the 10 `Modal` consumers
- [ ] No dropdown, select, or popover in any form modal (`ProvidersCreateModal`,
      `PlatformProvidersModal`, `CredentialCreateModal`, the three policy modals, `PolicySetModal`)
      gets visually clipped by the new `overflow-y-auto` region

### Risks and Mitigations (addendum)

| Risk | Impact | Mitigation |
|------|--------|------------|
| A form modal renders a dropdown/combobox that isn't portaled outside the scroll container | Medium — dropdown options could be visually clipped/cut off when opened near the modal's bottom edge | Manually open every dropdown/select in each of the 6 form-style modals after the change and confirm nothing is clipped; if one is found, that field's dropdown needs a portal (out of scope to fix here — flag and report instead of silently patching) |
| `90vh` is too aggressive on very short windows (e.g. laptop with browser chrome taking significant vertical space) and clips content awkwardly | Low | `90vh` leaves 10% margin top+bottom, consistent with common modal UX conventions; can be tuned to `85vh` if manual testing shows it's too tight |

## Open Questions (addendum)

- None — scope confirmed with user as "cap modal height to viewport, scroll inside" (option
  selected over "also scale width" or a custom breakpoint scheme).
