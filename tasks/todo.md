# Todo: Stable Provider-Scoped Resource Filters

## Phase 1: Provider state foundation

- [ ] Task 1: Add the versioned provider-filter session module.
- [ ] Task 2: Restore and persist VMware state per provider.
- [ ] Task 3: Preserve snapshots across provider/resource switching.

## Checkpoint: Provider state contract

- [ ] Run Tasks 1-3 focused tests together.
- [ ] Verify explicit URL > snapshot > defaults > empty precedence.
- [ ] Verify source/target and provider isolation.
- [ ] Run typecheck and focused lint.

## Phase 2: Remaining providers and VMware query lifecycle

- [ ] Task 4: Preserve FlashSystem and IBM Power provider filters.
- [ ] Task 5: Stabilize VMware debounce, previous data, cache, and errors.

## Checkpoint: Data lifecycle

- [ ] Verify provider return uses fresh cache without a request.
- [ ] Verify one settled `/vms_by_name` request after 300 ms.
- [ ] Verify tag+name performs no extra remote request.

## Phase 3: VMware UI and Resources ISE

- [ ] Task 6: Keep the VMware toolbar mounted and focused.
- [ ] Task 7: Preserve configured tags missing from `/tags` in Resources ISE.

## Checkpoint: User-visible regressions

- [ ] Provider A -> B -> A restores exact filters.
- [ ] Search keeps focus through debounce, fetch, error, and empty success.
- [ ] Pending debounce never shows an error.
- [ ] `DR-` and `recovery` remain visible and active in Resources ISE.

## Phase 4: Final verification

- [ ] Task 8: Run browser/network verification and final cleanup.
- [ ] Run the complete focused test set.
- [ ] Run `node_modules/.bin/tsc.cmd -b`.
- [ ] Run changed-file ESLint with zero warnings.
- [ ] Run `git diff --check` and inspect diff/status.
- [ ] Commit only in-scope files and preserve unrelated user files.
