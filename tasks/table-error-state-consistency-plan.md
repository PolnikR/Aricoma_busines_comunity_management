# Implementation Plan: Table Error-State Consistency

## Overview

Standardize two remaining real-data table error paths without changing table architecture or mock-only Identity & Access UI. The VM detail Snapshots tab must distinguish a failed `vdisks_by_vm` request from a successful empty result and expose retry through the existing shared table request-state UI. The Credentials table must replace its ad-hoc delete mutation error block with the existing shared `Alert` component while preserving current load-error handling through `DataTableRequestState`.

## Architecture Decisions

- Reuse existing shared components; do not introduce a new error abstraction.
- Use `DataTableRequestState` for the VM Snapshots request because it is a data-fetch error directly associated with a shared `DataTable` and already renders `FetchErrorAlert` with retry behavior.
- Keep snapshot loading (`DataTableSkeleton`), error, empty-success, and populated-success states mutually exclusive.
- Use shared `Alert` for credential delete mutation failures because delete is an action/mutation error, not a table-fetch retry state.
- Preserve the existing Credentials load-error path through `DataTableRequestState` unchanged.
- Do not modify Identity & Access tables; they are mock-data UI whose design is expected to change.
- No backend, OpenAPI, generated client, or API-contract changes are required.

## Dependency Graph

```text
Existing shared DataTableRequestState / FetchErrorAlert
                    |
                    v
VM snapshot request state + component regression test

Existing shared Alert
        |
        v
Credential delete mutation error + component regression test
        |
        v
Combined focused verification
```

The two implementation tasks are independent and may be implemented in parallel, followed by one combined verification checkpoint.

## Task 1: Add VM snapshot fetch error and retry state

**Description:** Extend the VM detail Snapshots tab to consume the TanStack Query error/refetch state returned by `useVdisksByVm`. When the request fails, render the existing shared table request-state error UI instead of falling through to the successful empty-table state. Retry must re-run the same VM/provider-scoped request. Successful requests with zero snapshot mappings must continue to render the existing empty table state.

**Acceptance criteria:**
- [ ] A failed enabled `useVdisksByVm` request displays the shared full table error state with a retry action in the Snapshots tab.
- [ ] Retry invokes the query refetch path and retry-in-progress state is reflected without showing a false empty result.
- [ ] Loading, failed request, successful empty snapshots, and successful populated snapshots remain distinct user-visible states.

**Verification:**
- [ ] Extend the existing `VirtualMachineDetailPanel` component test seam to cover failed snapshot loading and retry.
- [ ] Existing loading, empty snapshots, populated mappings, tabs, and drawer tests remain green.
- [ ] Focused ESLint for the changed component/test and `tsc -b` pass.

**Dependencies:** None

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx`

**Estimated scope:** Small (2 files)

## Task 2: Replace Credentials delete error with shared Alert

**Description:** Replace the custom red delete-error `<div>` in the Credentials table with the existing shared `Alert` component. The error remains a mutation-level notification above the table controls; the table load-error flow remains owned by `DataTableRequestState` and must not be changed.

**Acceptance criteria:**
- [ ] A failed credential delete renders shared `Alert` with `variant="error"` and the mutation error message.
- [ ] Successful delete behavior, confirmation flow, table selection, edit flow, and load-error retry behavior remain unchanged.
- [ ] No new error component or duplicate styling is introduced.

**Verification:**
- [ ] Extend the existing Credentials table component-test seam to assert the shared alert behavior after a delete mutation failure.
- [ ] Existing Credentials load/error/table interaction tests remain green.
- [ ] Focused ESLint for the changed component/test and `tsc -b` pass.

**Dependencies:** None

**Files likely touched:**
- `src/features/providers-connectors/credentials/components/CredentialsTable.tsx`
- existing Credentials table component test file

**Estimated scope:** Small (2 files)

## Checkpoint: Complete

- [ ] Task 1 focused tests pass.
- [ ] Task 2 focused tests pass.
- [ ] `DataTableRequestState` and `FetchErrorAlert` shared components require no behavioral changes.
- [ ] Shared `Alert` requires no behavioral changes.
- [ ] `node_modules/.bin/tsc.cmd -b` passes.
- [ ] Focused ESLint passes with zero warnings.
- [ ] `git diff --check` passes.
- [ ] Identity & Access mock tables remain untouched.

## Parallelization Opportunities

- Task 1 and Task 2 are independent and safe to implement in parallel because they touch separate feature areas and reuse stable shared primitives.
- Final typecheck/lint/diff verification should run after both tasks are complete.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Snapshot request failure is mistaken for a valid empty result | High | Explicitly order loading → error → success rendering and add a component regression test. |
| Retry accidentally changes request identity | Medium | Reuse the query's existing `refetch` function; do not reconstruct request parameters in UI code. |
| Mutation and fetch errors become conflated | Medium | Keep `Alert` for delete mutation failures and `DataTableRequestState` for fetch failures. |
| Scope expands into mock Identity & Access tables | Low | Explicitly exclude all Identity & Access table refactoring from this plan. |
| Shared components are modified unnecessarily | Low | Treat `DataTableRequestState`, `FetchErrorAlert`, and `Alert` as existing stable dependencies. |

## Open Questions

None. The requested scope and component ownership are sufficiently defined for implementation.
