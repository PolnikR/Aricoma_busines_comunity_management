# Implementation Plan: Fix Context Menu Bug, Add Shared Loading Spinner, Code Review

## Overview

Three separate pieces of work:
1. **Bug fix:** Edit/Delete buttons in the recovery group context menu do nothing when clicked.
2. **Feature:** Give the rollback confirmation the same spinner+text loading effect used by "Saving..." buttons elsewhere, by extracting that effect into a shared component and reusing it everywhere save/submit logic runs.
3. **Review:** Code review of every commit on this branch that differs from the `test` branch (merge base `9562e06`, 14 commits ahead).

## Root Cause: Edit/Delete Do Nothing

`RecoveryGroupsTable.tsx` renders **two** `RecoveryGroupContextMenu` instances whenever the menu is open and `pushToOrchestrator` is false:

```tsx
{openMenuId && currentMenuGroup && !currentMenuGroup.pushToOrchestrator && (
  <RecoveryGroupContextMenu ... />   // <-- dead leftover, no rollback prop
)}
{openMenuId && currentMenuGroup && (
  <RecoveryGroupContextMenu ... rollback={{...}} />  // <-- the real one
)}
```

Both portal into `document.body` at the identical position. Each instance registers its own `document.addEventListener('pointerdown', ...)` outside-click handler that checks only its **own** `menuRef`. Since the first (leftover) menu's ref does not contain a click that lands inside the second menu's buttons, its handler fires `onClose()` on `pointerdown` — which unmounts both menus **before** the button's `click` event (edit/delete) can fire. This is the classic "unmount between mousedown and click" bug: nothing appears to happen because the button is gone before `onClick` runs.

**Fix:** delete the first (dead) block entirely. The second block already handles the disabled/enabled rollback state correctly via the `rollback.disabled` computation, so no behavior is lost.

## Shared Loading Spinner

Today, "Saving..." feedback is inconsistent:
- `RecoveryGroupBuilder.tsx` — has a real spinner (`animate-spin` span) **and** swaps text to `t('messages.saving')`
- `RecoveryAppBuilder.tsx`, `PolicySetModal.tsx`, `SnapshotPolicyModal.tsx` — swap text only, **no spinner**
- `ConfirmDialog.tsx` (used by rollback) — swaps text only, **no spinner**

**Fix:** extract the spinner markup from `RecoveryGroupBuilder.tsx` into a new shared `Spinner` component (`src/shared/components/spinner/Spinner.tsx`), then use it as the `startIcon` (or inline span for the raw-button `ConfirmDialog`) everywhere a save/submit action shows a "Saving..." label. This gives the rollback button — and every other save action — the identical spinner + text effect.

## Task List

### Phase 1: Fix Broken Edit/Delete Buttons

**Task 1: Remove the duplicate context-menu render block**

Delete the dead `RecoveryGroupContextMenu` block (no `rollback` prop) that renders whenever `!currentMenuGroup.pushToOrchestrator`. Keep only the single block that always includes the `rollback` prop.

**Acceptance criteria:**
- [ ] Only one `<RecoveryGroupContextMenu>` is rendered per open menu, regardless of `pushToOrchestrator`
- [ ] Clicking Edit opens the editor for the group
- [ ] Clicking Delete opens the delete confirmation
- [ ] Rollback button still shows/hides/disables exactly as before

**Verification:**
- [ ] Manual: open menu on a group with `pushToOrchestrator = false`, click Edit → editor opens
- [ ] Manual: same group, click Delete → confirm dialog opens
- [ ] Tests pass: `npm test`

**Dependencies:** None
**Files:** `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
**Estimated scope:** XS (delete ~17 lines)

### Phase 2: Shared Spinner Component

**Task 2: Extract `Spinner` shared component**

Create `src/shared/components/spinner/Spinner.tsx` containing the spinner markup currently inlined in `RecoveryGroupBuilder.tsx`:
```tsx
<span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
```
Accept an optional `className` to override size, since it will be reused at slightly different sizes/colors if ever needed. Default matches the existing look exactly (no visual change where already used).

**Acceptance criteria:**
- [ ] `Spinner` renders identical markup/classes to the current inline version
- [ ] Component accepts optional `className` for size overrides
- [ ] `aria-hidden="true"` preserved (decorative, label text conveys state)

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

**Dependencies:** None
**Files:** `src/shared/components/spinner/Spinner.tsx` (new)
**Estimated scope:** XS (new file, ~10 lines)

**Task 3: Use `Spinner` in `RecoveryGroupBuilder.tsx`**

Replace the inline spinner span with `<Spinner />`. No behavior change — this is the reference implementation the others will match.

**Acceptance criteria:**
- [ ] Save button visually identical before/after
- [ ] Uses shared `Spinner` instead of inline markup

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual: create a recovery group, confirm spinner shows while saving

**Dependencies:** Task 2
**Files:** `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
**Estimated scope:** XS

**Task 4: Add spinner to the rollback confirmation button**

`ConfirmDialog.tsx` is a raw `<button>` (not the shared `Button` component), so add the `Spinner` inline next to `loadingLabel` when `isLoading` is true.

**Acceptance criteria:**
- [ ] Rollback confirm button shows spinner + "Rolling back..." while `isRollingBack`
- [ ] Cancel button unaffected
- [ ] Every other `ConfirmDialog` consumer (delete dialogs, discard dialogs) gets the same spinner for free when they pass `isLoading`

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual: click Roll back → confirm → spinner + "Rolling back..." visible until result modal appears

**Dependencies:** Task 2
**Files:** `src/shared/components/modal/ConfirmDialog.tsx`
**Estimated scope:** XS

**Task 5: Add spinner to remaining save buttons**

Apply the same `startIcon={isSaving/isPending ? <Spinner /> : undefined}` pattern to the three text-only "Saving..." buttons:
- `RecoveryAppBuilder.tsx` (save application button)
- `PolicySetModal.tsx` (submit button)
- `SnapshotPolicyModal.tsx` (submit button)

**Acceptance criteria:**
- [ ] All three buttons show spinner + "Saving..." while their respective pending/saving flag is true
- [ ] No change to disabled logic or existing text swap — only the icon is added

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual: trigger a save in each of the three flows, confirm spinner appears

**Dependencies:** Task 2
**Files:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx`
- `src/features/recovery-plans/snapshot-policies/components/SnapshotPolicyModal.tsx`
**Estimated scope:** S (3 small, identical edits)

### Checkpoint: Phases 1–2 Complete
- [ ] All tests pass, build succeeds
- [ ] Edit/Delete work from the context menu in every state
- [ ] Every save/submit button and the rollback confirm button show a consistent spinner + text while pending

### Phase 3: Code Review

**Task 6: Review all commits that differ from `test` branch**

Diff scope: `origin/test...HEAD` (merge base `9562e06`), i.e. the 14 commits made on `spike/ant-design-shell` since it diverged from `test`. Run the five-axis review (correctness, readability, architecture, security, performance) per the `code-review-and-quality` skill, focused on the actual diff, not the whole file.

**Acceptance criteria:**
- [ ] Every changed file in the diff is reviewed
- [ ] Findings labeled Critical / Required / Nit / Optional / FYI
- [ ] Report delivered to the user before any further changes are made based on it

**Dependencies:** Tasks 1–5 (review should cover the new commits too)
**Estimated scope:** M (14 commits, ~10 files)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Removing the dead menu block hides an untested edge case | Low | Rollback `disabled` logic already accounts for `!pushToOrchestrator`; behavior is unchanged, only the duplicate render is removed |
| Spinner color assumes white-on-colored button | Low | All target buttons use `primary`/`danger` variants (colored background, white text) — matches existing usage |
| Scope creep: touching 7 files in one pass | Med | Each file gets a one-line, mechanical change (add `Spinner` as `startIcon`); no logic changes |

## Open Questions

None — requirements are clear.
