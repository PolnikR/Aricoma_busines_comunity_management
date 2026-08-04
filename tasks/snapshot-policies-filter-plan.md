# Implementation Plan: Snapshot Policies Filter Panel + Branch Integration

## Overview

Add a "Filters" panel to the Snapshot Policies table (filtering by `level`
and by enabled/disabled status), mirroring the filter pattern already used
in `RecoveryGroupsTable`. Policy Sets does **not** get a filter for now
(confirmed with the user — `PolicySet` has no level/status field of its
own). After the filter change is committed and tests pass, fast-forward
`spike/ant-design-shell` to `test`, merge `spike/ant-design-shell` into
`master`, run the full suite again, and — only after one more explicit
go-ahead — push `master` and `spike/ant-design-shell` to `origin`.

## Architecture Decisions

- **Reuse `DataTableToolbar`'s existing `filterPanel`/`filterButtonLabel`/
  `activeFilterCount`/`onApplyFilters`/`onClearFilters`/`onFilterOpen`
  props** — this is the same shared toolbar component already rendering
  the "Comfortable / Compact / Filters" row in `RecoveryGroupsTable`; no
  changes to the shared component itself are needed.
- **Apply-on-confirm pattern**: mirror `RecoveryGroupsTable` exactly —
  `pendingFilters` state inside the modal, only committed to the real
  `filters` state (which drives the actual row filtering) when "Apply" is
  clicked. This matches the existing UX convention rather than filtering
  live as the user picks options.
- **Level filter options are derived from the actual data** (`Array.from(new
  Set(policies.map(p => p.level))).sort()`), same as
  `RecoveryGroupsTable.filterOptions.workloadTypes` — not a hardcoded list,
  so it naturally includes any custom level a user has entered (the
  existing form already allows a custom level string, not just the four
  presets).
- **Status filter is a fixed two-option list** (`enabled`/`disabled`) since
  `SnapshotPolicy.enabled` is a plain boolean, not derived from data.
- **Branch integration is git-only, no code changes**: `test` is already a
  strict descendant of `spike/ant-design-shell` (0 commits diverge the
  other way), so `spike/ant-design-shell` ← `test` is a fast-forward.
  `master`'s only commit absent from `spike/ant-design-shell` is itself a
  historical merge of an earlier `spike` state, so `master` ← `spike/ant-
  design-shell` should merge cleanly, but it is still a 184-commit change
  to `master` and gets a real merge commit (not a fast-forward).

## Task List

### Phase 1: Snapshot Policies Filter Panel

- [ ] Task 1: Add filter state and the filter panel UI to `SnapshotPoliciesTable`
- [ ] Task 2: Add the filter-related translation keys (en/sk/cs)
- [ ] Task 3: Add/extend tests covering the new filter behavior

### Checkpoint: Filter Panel Complete
- [ ] Full test suite passes (`npm run test`)
- [ ] Lint and typecheck pass (`npm run lint`, `npm run typecheck`)
- [ ] Manually confirms the "Filters" button now appears on the Snapshot
      Policies page, opens a modal with Level/Status dropdowns, and
      filtering narrows the table correctly
- [ ] Commit the filter changes on `test`

### Phase 2: Branch Integration (git operations only)

- [ ] Task 4: Fast-forward `spike/ant-design-shell` to `test`
- [ ] Task 5: Merge `spike/ant-design-shell` into `master`
- [ ] Task 6: Run the full test suite on the merged `master`

### Checkpoint: Ready to Push — EXPLICIT CONFIRMATION REQUIRED
- [ ] All of Phase 2's merges are local only — nothing pushed yet
- [ ] Full test suite green on merged `master`
- [ ] **Stop and re-confirm with the user before running `git push` on
      `master` and `spike/ant-design-shell`** — this affects the shared
      remote and is the one step in this plan that isn't easily undone.
      Confirming the plan up front does not substitute for this — the
      question gets asked again at this exact point, with the real diff
      stat in hand.
- [ ] Push `master` and `spike/ant-design-shell` to `origin` only after
      that explicit go-ahead

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `master` merge brings in 184 commits at once | High — large, hard-to-review diff landing on `master` in one step | Branch topology check (done) shows master's only unique commit is a merge artifact, not real conflicting content; run full test suite on the merged result before pushing anything |
| Filter UI regresses existing Snapshot Policies table behavior (search, pagination, drawer) | Medium | Extend the existing `SnapshotPoliciesTable.test.tsx` rather than replace it; keep all existing assertions passing |
| Custom/unusual `level` values (free text field) don't render sensibly in the filter dropdown | Low | Filter options are derived from live data (same approach as `RecoveryGroupsTable`), so any custom level a user has entered still shows up as a filter option |

## Open Questions

None outstanding — filter fields for Snapshot Policies (level + status)
and the decision to skip filtering for Policy Sets were both confirmed
with the user. The exact push/merge sequence (test → spike/ant-design-
shell → master) was also confirmed, with an explicit re-confirmation gate
kept before the actual `git push`.
