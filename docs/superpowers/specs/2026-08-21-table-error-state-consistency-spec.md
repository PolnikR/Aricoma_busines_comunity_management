# Table Error-State Consistency

## Problem Statement

Two real-data table flows still present inconsistent error behavior compared with the rest of the frontend.

The VM detail Snapshots tab loads related storage/snapshot data asynchronously, but a failed request is not represented as an error. After loading completes, the UI can fall through to the same presentation used for a legitimate empty snapshot result. This makes a backend/request failure indistinguishable from "no snapshots" and gives the user no retry action.

The Credentials table already uses the shared table request-state pattern for list-loading failures, but credential delete failures are rendered through a one-off red error block. This duplicates styling and creates a second error presentation model inside a table that otherwise follows the shared component system.

Identity & Access tables are intentionally excluded because they currently use mock data and their design is expected to change.

## Solution

Use the frontend's existing shared error components consistently at the two affected seams.

For VM snapshot loading, the Snapshots tab will consume the query's failure, retry/refetch, and retry-in-progress state. A failed request will display the same shared table request-state UI used by other data tables, including the standard fetch error presentation and Retry action. Loading, error, successful-empty, and successful-populated results will remain separate states.

For Credentials deletion, the custom mutation error block will be replaced by the shared error `Alert`. The existing Credentials list-loading error flow will remain unchanged and continue to use the shared table request-state component.

No new shared abstraction is needed and no backend/API contract changes are part of this work.

## User Stories

1. As a user inspecting a virtual machine, I want the Snapshots tab to tell me when snapshot data could not be loaded, so that I do not mistake a request failure for a VM with no snapshots.
2. As a user inspecting a virtual machine, I want a Retry action after a snapshot request fails, so that I can recover from a temporary backend or network problem without closing the detail panel.
3. As a user retrying snapshot loading, I want the UI to indicate that the retry is in progress, so that I know my action was accepted.
4. As a user inspecting a virtual machine with no snapshot mappings, I want to continue seeing the existing valid empty state, so that an empty result is clearly different from an error.
5. As a user inspecting a virtual machine with snapshot mappings, I want the existing shared snapshot table to remain unchanged when the request succeeds, so that the fix does not alter normal behavior.
6. As a user opening the Snapshots tab while data is loading, I want the existing loading skeleton to remain visible, so that the established loading experience is preserved.
7. As a user managing credentials, I want a failed delete operation to use the same visual error language as the rest of the application, so that errors are presented consistently.
8. As a user managing credentials, I want the delete failure message to remain visible in the table context, so that I understand why the requested action did not complete.
9. As a user managing credentials, I want successful delete behavior to remain unchanged, so that this consistency work does not alter the underlying delete workflow.
10. As a user managing credentials, I want list-loading failures and mutation failures to remain visually and behaviorally distinct, so that I can understand whether the table failed to load or a specific action failed.
11. As a frontend maintainer, I want both fixes to reuse existing shared components, so that error handling remains centralized and duplicate styling is reduced.
12. As a frontend maintainer, I want the VM snapshot fix to reuse the query's existing refetch operation, so that retry uses the same request identity and parameters as the failed request.
13. As a frontend maintainer, I want the Credentials delete fix to use the existing shared mutation-style alert rather than the fetch retry component, so that the component choice reflects the type of failure.
14. As a frontend maintainer, I want component-level regression tests at the existing UI seams, so that the user-visible behavior is protected without introducing lower-level implementation-detail tests.
15. As a product team member, I want Identity & Access mock tables left unchanged, so that effort is not spent stabilizing UI that is already expected to be redesigned.

## Implementation Decisions

- The VM Snapshots tab will continue using the existing VM-storage query hook and will additionally consume its error, fetching/retry, and refetch state.
- The VM Snapshots tab will use the existing shared table request-state component for request failures. That shared component already owns the standard full fetch-error presentation and Retry behavior.
- Snapshot rendering will follow an explicit state order: loading, failed request, successful result. A successful result may then be either empty or populated.
- A request failure must never be represented by the successful-empty snapshot state.
- Retry will call the query's existing refetch operation. The UI will not reconstruct provider IDs, VM names, or request parameters for retry.
- The shared snapshot `DataTable` and its successful-data rendering will remain unchanged.
- The Credentials list-loading error flow will remain unchanged and continue using the existing shared table request-state component.
- Credential delete mutation failures will use the existing shared error `Alert` rather than `FetchErrorAlert`, because there is no separate table-fetch retry operation associated with the delete error presentation.
- The delete error alert will preserve the backend/client error message currently shown to the user.
- No new shared error component, table component, hook, or error model will be introduced.
- Existing shared `DataTableRequestState`, `FetchErrorAlert`, and `Alert` behavior will not be changed as part of this work.
- No OpenAPI, generated client, backend response, or API schema changes are required.
- Identity & Access mock tables and their current raw-table/error implementation are out of scope.

## Testing Decisions

- Tests will assert externally visible component behavior rather than implementation details such as exact internal wrapper structure.
- The VM detail component is the preferred test seam for snapshot errors because it already owns the loading, empty, populated, tab-selection, and query-hook integration behavior.
- VM snapshot regression coverage will include: loading remains a skeleton, failed request displays an accessible shared error state, Retry calls the existing refetch operation, successful empty data does not display the error state, and successful populated data continues to render mappings.
- The existing VM detail test setup that mocks the storage-volume query hook will be extended rather than introducing a new testing seam.
- The Credentials table component remains the preferred seam for delete-error behavior because it owns the delete mutation, confirmation flow, and mutation-level UI feedback.
- Credentials regression coverage will verify that a failed delete exposes a shared accessible error alert containing the mutation message while existing list load-error behavior remains unchanged.
- Existing tests for successful delete, selection, edit, list loading, and table interactions should remain green.
- Shared error-component unit tests do not need to be expanded unless implementation reveals a missing behavior in the shared components themselves; that is not expected from the current design.

## Out of Scope

- Refactoring `Users`, `Roles`, `Permissions`, `Organizations`, or `Sessions` tables in Identity & Access.
- Replacing Identity & Access raw HTML tables with shared `DataTable`.
- Changing Identity & Access mock-data hooks or their temporary error presentation.
- Redesigning table layout, pagination, filtering, density controls, drawers, or table columns.
- Changing backend error-response contracts or OpenAPI documentation.
- Introducing global error normalization or a new application-wide error model.
- Changing credential delete API behavior, retry semantics, or confirmation-dialog behavior.
- Changing VM snapshot API request parameters or provider-resolution logic.
- Refactoring the shared table/error component architecture.

## Further Notes

The scope deliberately separates fetch errors from mutation errors. Fetch failures attached to a table use the existing table request-state pattern because retry is part of that state. The credential delete error is an action result and therefore uses the shared generic error alert instead.

This work is intended as a narrow consistency and correctness repair. The shared components already provide the desired visual language, so implementation should remain limited to wiring existing query/mutation state into those components and adding focused regression coverage.
