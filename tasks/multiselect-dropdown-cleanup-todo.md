# Todo: Remove Orphaned MultiSelectDropdown

## Phase 1: Confirm deletion boundary

- [ ] Task 1: Re-scan all source exports/imports/usages for `MultiSelectDropdown`.
- [ ] Confirm only the component, its test, and historical documentation/task-plan references remain.

## Checkpoint: Safe to delete

- [ ] No runtime consumer or barrel export depends on the component.

## Phase 2: Remove dead code

- [ ] Task 2: Delete `src/shared/components/form/MultiSelectDropdown.tsx`.
- [ ] Delete `src/shared/components/form/MultiSelectDropdown.test.tsx`.

## Checkpoint: Verification

- [ ] Re-run repository-wide `MultiSelectDropdown` reference search.
- [ ] Run focused provider/platform-provider single-select tests.
- [ ] Run focused lint/typecheck for the affected boundary.
- [ ] Run `git diff --check` and inspect status.
- [ ] Commit only the cleanup files; keep historical docs/plans unchanged.
