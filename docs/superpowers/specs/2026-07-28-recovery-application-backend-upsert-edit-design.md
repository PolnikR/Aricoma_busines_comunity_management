# Recovery Application Backend Upsert Edit Design

## Status

Approved for implementation planning.

## Context

Recovery applications are loaded from the real backend through
`GET /api/get_recovery_apps` and submitted through
`POST /api/submit_dag?filename=<name>`. The backend implements upsert semantics:
submitting an unchanged filename updates the existing file, while submitting a
changed filename creates a new file.

The previous editor depended on mock CRUD endpoints and was removed with the
mock data flow. Editing must be restored without reintroducing MSW handlers,
local storage, or frontend-side persistence.

## Decision

Restore the dedicated route:

```text
/recovery-plans/recovery-applications/:id/edit
```

The editor will reuse `RecoveryAppBuilder` and initialize it through the
existing `initialData` property.

The route `id` is the backend `file` value mapped to
`RecoveryApplicationListItem.id`. The editor loads the recovery application
list through the existing React Query hook and finds the matching item by this
identifier.

## Data Flow

```text
Edit action
  -> /recovery-plans/recovery-applications/:id/edit
  -> useRecoveryApplications()
  -> GET /api/get_recovery_apps
  -> find item where item.id equals route id
  -> map backend application to RecoveryApplicationFormState
  -> RecoveryAppBuilder initialData
  -> user edits application
  -> POST /api/submit_dag?filename=<current form name>
  -> invalidate recovery-applications query
  -> navigate back to recovery application list
```

The frontend will not compare the original and edited filenames and will not
delete or rename files. It always submits the current form name. The backend is
the sole owner of update-versus-create behavior:

- unchanged filename updates the existing file;
- changed filename creates a new file and leaves the original file unchanged.

## UI Behavior

The recovery application detail drawer regains an `Edit` action. The deleted
mock-backed `Delete` action is not restored.

The edit page uses the same builder layout and validation as the create page.
It displays:

- a loading state while the backend list is loading;
- a retryable error state when loading fails;
- a not-found state when the route identifier does not match a backend file;
- an inline submit error while keeping the edited form visible;
- a saving state that disables repeated submissions.

After a successful submission, the application returns to the list. The list
query is invalidated so the backend result is fetched again.

## Data Mapping

The selected backend application maps to builder state as follows:

- `application.name` -> `name`;
- `application.description` -> `description`;
- `application.environment` -> `environment`;
- `application.tiers` -> `Map<string, RecoveryTier>`.

The recovery list schema must validate tiers deeply enough for the editor. The
backend tier contract contains `order`, `description`, and a nested
`recovery_group` with its name, description, and VM list. The API boundary maps
this transport shape to the builder's flat `RecoveryTier` model and maps it back
before submission. No unsafe cast from arbitrary backend data will initialize
the builder.

Platform and connection fields continue to use the current recovery submission
contract when the builder produces `RecoveryApplicationData`.

## Components and Responsibilities

### `RecoveryApplicationsTable`

- displays backend recovery applications;
- opens the existing detail drawer;
- invokes `onEdit(id)` from the Edit action;
- contains no persistence logic.

### `RecoveryApplicationsListPage`

- navigates from the selected backend file ID to the edit route;
- continues loading the list from `GET /api/get_recovery_apps`.

### `RecoveryApplicationEditorPage`

- reads the route ID;
- loads and selects the backend application;
- maps it to `RecoveryApplicationFormState`;
- passes it to `RecoveryAppBuilder.initialData`;
- submits through `useSubmitRecoveryApplication`;
- handles loading, error, not-found, saving, and submit-error states.

### `RecoveryAppBuilder`

- remains the shared create/edit form;
- owns editable form state;
- receives initial backend values only through `initialData`;
- emits the completed form through `onSave`.

### Recovery API and hooks

- `fetchRecoveryApplications` remains the only read operation;
- `submitRecoveryApplicationDag` remains the only write operation;
- `useSubmitRecoveryApplication` invalidates the backend list after success;
- no mock create, update, detail, or delete endpoint is restored.

## Error Handling

Network, HTTP, and response validation errors from the backend are shown to the
user. A failed submission does not navigate away or discard the current form.
An unknown route ID produces a not-found state rather than an empty builder.

## Testing

Tests will verify:

1. the editor finds an application by its backend file ID;
2. backend data is mapped into `RecoveryAppBuilder.initialData`;
3. saving without changing the name submits the unchanged filename;
4. changing the name submits the changed filename;
5. submission performs exactly one request to `submit_dag`;
6. successful submission invalidates the list and navigates back;
7. loading, backend error, not-found, and submit-error states render correctly;
8. the recovery drawer exposes Edit but not mock-backed Delete.

## Out of Scope

- frontend file rename or deletion;
- restoring mock recovery endpoints or mock data;
- local storage persistence;
- comparing filenames to decide between create and update;
- changing backend upsert semantics;
- removing the MSW package retained for future use.
