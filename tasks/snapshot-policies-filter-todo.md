# Todo: Snapshot Policies Filter Panel + Branch Integration

See `tasks/snapshot-policies-filter-plan.md` for full context.

## Task 1: Add filter state and filter panel UI to SnapshotPoliciesTable

**Description:** `SnapshotPoliciesTable.tsx` currently passes only
`searchValue`/`onSearchChange`/`density`/`onDensityChange` to
`DataTableToolbar` — no `filterPanel` is supplied, so no "Filters" button
renders. Add `filters`/`pendingFilters` state (level, status), a
`filterOptions.levels` derived list, apply the filters to `rows` before
they reach `useTableState`, and wire `filterPanel`/`filterButtonLabel`/
`filterTitle`/`activeFilterCount`/`onFilterOpen`/`onApplyFilters`/
`onClearFilters` — mirroring `RecoveryGroupsTable.tsx`'s existing filter
wiring exactly (same apply/cancel/clear button labels, same `Field`/
`Select` filter controls inside `filterPanel`).

**Acceptance criteria:**
- [ ] A "Filters" button appears next to the density toggle in the
      Snapshot Policies toolbar
- [ ] Selecting a level and clicking "Apply" narrows the table to only
      policies with that level; "All Levels" shows everything
- [ ] Selecting a status (Enabled/Disabled) and clicking "Apply" narrows
      the table accordingly; "All Statuses" shows everything
- [ ] The Filters button shows an active-filter-count badge when 1 or 2
      filters are applied
- [ ] "Clear all" resets both filters and the badge

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/snapshot-policies/components/SnapshotPoliciesTable.test.tsx --no-coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: open Recovery Plans → Snapshot Policies, click
      Filters, filter by level and by status independently and combined,
      confirm the table narrows correctly each time

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/snapshot-policies/components/SnapshotPoliciesTable.tsx`

**Estimated scope:** Small: 1 file

---

## Task 2: Add filter-related translation keys (en/sk/cs)

**Description:** Add the new keys the filter panel needs —
`snapshotPolicies.filters.title`, `.button`, `.level`, `.allLevels`,
`.status`, `.allStatuses` — to all three locale files, keeping exact key
parity (currently 1101 keys each). Reuse the existing
`snapshotPolicies.enabled`/`snapshotPolicies.disabled` keys for the two
status option labels rather than adding new ones.

**Acceptance criteria:**
- [ ] All 6 new keys added to `en.json`, `sk.json`, `cs.json` with real
      (not placeholder) translations in each language
- [ ] `Object.keys(en).length === Object.keys(sk).length === Object.keys(cs).length`
      and no key is missing from either non-English file

**Verification:**
- [ ] Tests pass: N/A (verified by the parity check below, not a test file)
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run the parity script (see Task 7 verification below)
      and confirm empty diffs

**Dependencies:** None (can be done alongside or before Task 1)

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Small: 3 files

---

## Task 3: Add/extend tests for the new filter behavior

**Description:** Extend `SnapshotPoliciesTable.test.tsx` with cases
covering: the Filters button renders, opening it shows Level/Status
selects, applying a level filter narrows results, applying a status
filter narrows results, and clearing resets to the full list. Follow the
existing test file's render/mock conventions (mocked `useTranslation`,
mocked `useDeleteSnapshotPolicy`) — do not replace existing tests, add to
them.

**Acceptance criteria:**
- [ ] New test cases exist for: filter button visibility, level filtering,
      status filtering, clear-filters behavior
- [ ] All pre-existing `SnapshotPoliciesTable.test.tsx` assertions still
      pass unmodified

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/snapshot-policies/components/SnapshotPoliciesTable.test.tsx --no-coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: none beyond the automated tests

**Dependencies:** Task 1 (filter UI must exist to test against)

**Files likely touched:**
- `src/features/recovery-plans/snapshot-policies/components/SnapshotPoliciesTable.test.tsx`

**Estimated scope:** Small: 1 file

---

## Checkpoint: Filter Panel Complete

- [ ] `npm run build` passes (lint + typecheck + full test suite + vite build)
- [ ] Manual browser check of the Filters button, if browser access is
      available this session
- [ ] Commit Tasks 1-3 together on `test` with message describing the
      Snapshot Policies filter panel addition

---

## Task 4: Fast-forward spike/ant-design-shell to test

**Description:** `spike/ant-design-shell` is currently an ancestor of
`test` (0 commits diverge from spike toward test in the other direction),
so this is a plain fast-forward, not a real merge.

**Acceptance criteria:**
- [ ] `git rev-parse spike/ant-design-shell` equals `git rev-parse test`
      after this step
- [ ] No merge commit is created (fast-forward only)

**Verification:**
- [ ] Tests pass: re-run `npm run test` on the fast-forwarded branch (should be identical result to the Task 1-3 checkpoint, since no new commits are introduced beyond what was just tested)
- [ ] Build succeeds: not required again (no content change from a fast-forward)
- [ ] Manual check: `git log --oneline -1 spike/ant-design-shell` and `git log --oneline -1 test` show the same commit hash

**Dependencies:** Checkpoint after Task 3 (filter changes committed and green)

**Files likely touched:** None (git ref update only)

**Estimated scope:** XS: 0 files

---

## Task 5: Merge spike/ant-design-shell into master

**Description:** Merge the now-updated `spike/ant-design-shell` (== `test`
HEAD) into `master`. Expect a real merge commit, not a fast-forward, since
`master` has one commit `spike/ant-design-shell` doesn't (a historical
"Merge pull request #2" merge commit) — but that commit is a merge
artifact, not conflicting content, so no conflicts are expected.

**Acceptance criteria:**
- [ ] `master` now contains all commits from `spike/ant-design-shell`
- [ ] No merge conflicts required manual resolution (if conflicts do
      appear, stop and report them rather than resolving blindly)

**Verification:**
- [ ] Tests pass: full suite run on merged `master` (Task 6)
- [ ] Build succeeds: `npm run build` on merged `master`
- [ ] Manual check: `git log --oneline --graph -10 master` shows the
      expected merge commit and recent history

**Dependencies:** Task 4

**Files likely touched:** None directly (merge may touch any file that
differs between the branches — expect the full history of changes since
the branches' common ancestor, commit `947a58c`)

**Estimated scope:** N/A — this is a history merge, not a scoped code change

---

## Task 6: Run the full test suite on merged master

**Description:** After the merge, run `npm run build` (lint + typecheck +
full vitest suite + production build) on the merged `master` to confirm
nothing broke by combining the two histories.

**Acceptance criteria:**
- [ ] `npm run build` exits 0
- [ ] No new lint/typecheck errors introduced by the merge
- [ ] No test regressions

**Verification:**
- [ ] Tests pass: `npm run build`
- [ ] Build succeeds: (same command covers this)
- [ ] Manual check: review the test count against the last known-good
      count from the Phase 1 checkpoint to confirm nothing silently
      dropped out

**Dependencies:** Task 5

**Files likely touched:** None

**Estimated scope:** N/A — verification only

---

## Checkpoint: Ready to Push — EXPLICIT CONFIRMATION REQUIRED

- [ ] Merges are local only; nothing pushed to `origin` yet
- [ ] `npm run build` is green on merged `master`
- [ ] **Ask the user explicitly, at this point, with the actual commit/diff
      count in hand, before running any `git push`.** Do not treat the
      earlier planning conversation as sufficient authorization for the
      push itself.
- [ ] Once confirmed: `git push origin spike/ant-design-shell` and
      `git push origin master`
