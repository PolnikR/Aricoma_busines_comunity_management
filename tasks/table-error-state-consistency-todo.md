# Todo: Table Error-State Consistency

## Phase 1: VM snapshot request state

- [x] Task 1: Read `error`, `isFetching`/retry state, and `refetch` from `useVdisksByVm` in `VirtualMachineDetailPanel`.
- [x] Render the shared `DataTableRequestState` error UI for failed snapshot requests.
- [x] Keep loading, error, empty-success, and populated-success states distinct.
- [x] Add component regression coverage for error and retry.

## Phase 2: Credentials mutation error UI

- [x] Task 2: Replace the custom credential delete error `<div>` with shared `Alert` using `variant="error"`.
- [x] Preserve the existing `DataTableRequestState` load-error behavior unchanged.
- [x] Add component coverage for the delete error state. The existing adjacent test path is protected by Rel.AI sensitive-path policy, so the focused regression test lives at `src/features/providers-connectors/TableMutationError.test.tsx` and exercises `CredentialsTable` directly.

## Checkpoint: Verification

- [x] Run the focused VM detail test file.
- [x] Run the focused Credentials table test file.
- [x] Run focused ESLint for changed files with zero warnings.
- [x] Run `node_modules/.bin/tsc.cmd -b`.
- [x] Run `git diff --check` and inspect task diff/status.
- [x] Confirm Identity & Access mock tables were not modified.
