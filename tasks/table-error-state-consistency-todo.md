# Todo: Table Error-State Consistency

## Phase 1: VM snapshot request state

- [ ] Task 1: Read `error`, `isFetching`/retry state, and `refetch` from `useVdisksByVm` in `VirtualMachineDetailPanel`.
- [ ] Render the shared `DataTableRequestState` error UI for failed snapshot requests.
- [ ] Keep loading, error, empty-success, and populated-success states distinct.
- [ ] Add component regression coverage for error and retry.

## Phase 2: Credentials mutation error UI

- [ ] Task 2: Replace the custom credential delete error `<div>` with shared `Alert` using `variant="error"`.
- [ ] Preserve the existing `DataTableRequestState` load-error behavior unchanged.
- [ ] Add/adjust Credentials table component coverage for the delete error state.

## Checkpoint: Verification

- [ ] Run the focused VM detail test file.
- [ ] Run the focused Credentials table test file.
- [ ] Run focused ESLint for changed files with zero warnings.
- [ ] Run `node_modules/.bin/tsc.cmd -b`.
- [ ] Run `git diff --check` and inspect task diff/status.
- [ ] Confirm Identity & Access mock tables were not modified.
