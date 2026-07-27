# Recovery Application Local Storage Repository Design

## Goal

Prevent recovery-application builder data from leaking into a later create
session, and centralize temporary `localStorage` persistence behind a
repository boundary that can later be replaced by an HTTP implementation.

## Scope

- Recovery application list, create, read, update, and delete persistence.
- Recovery application create and edit React Query hooks.
- Builder form-state initialization and immutable tier updates.
- Reset behavior after Back and successful Save.
- Automated tests for persistence and state isolation.

Airflow DAG submission remains an HTTP operation and is not moved into the
local-storage repository.

## Architecture

The feature data flow will be:

```text
page
  -> React Query hook
  -> RecoveryApplicationRepository
  -> LocalStorageRecoveryApplicationRepository
  -> browser localStorage
```

The repository contract belongs to the feature API boundary:

```text
src/features/recovery-plans/recovery-applications/
├── api/
│   ├── recoveryApplicationRepository.ts
│   ├── localStorageRecoveryApplicationRepository.ts
│   └── useRecoveryApplications.ts
├── components/
├── model/
├── pages/
└── utils/
```

`helpers` remains reserved for stateless helper functions. Storage access is
not a helper because it owns persistence, serialization, identifiers, and
failure behavior.

## Repository Contract

`RecoveryApplicationRepository` exposes asynchronous CRUD operations:

- `getAll()`
- `getById(id)`
- `create(data, submission?)`
- `update(id, data)`
- `delete(id)`

The contract returns existing recovery-application domain types. All methods
are asynchronous even though `localStorage` is synchronous, so a future HTTP
repository can replace it without changing hooks or pages.

The local-storage implementation exclusively owns:

- the `mockRecoveryApplications` key;
- JSON serialization and parsing;
- generated IDs and timestamps;
- preservation of `createdAt` during updates;
- lookup and not-found errors;
- malformed-storage errors.

It must not silently fall back to an HTTP request. Selecting local storage or
HTTP is an application configuration decision, not runtime fallback behavior.

## React Query Integration

Existing hooks retain their public purpose and call the selected repository.
Create, update, and delete mutations invalidate the list query; update also
invalidates the item query.

Create and edit pages use `mutateAsync`. They navigate away only after the
repository operation succeeds. A rejected mutation leaves the builder mounted
with all metadata, tiers, and selected VMs intact and exposes the existing
mutation error to the UI.

Direct `localStorage` access is removed from pages and components.

## Builder State Isolation

Default builder state is produced by a factory function. Every invocation
creates:

- a new form-state object;
- a new `Map`;
- new tier objects;
- new VM arrays.

When editing, incoming data is cloned into builder-owned state. Builder update
handlers never mutate a tier or VM array obtained from previous state. Adding,
removing, editing, reordering, adding, or deleting a tier returns newly owned
objects.

This removes the current leak caused by shallow-copying the `Map` and mutating
the shared tier object with `tier.vms.push(...)`.

## Reset Semantics

- **Back:** navigation unmounts the builder. No explicit pre-navigation reset
  is required because the next mount receives a freshly created state.
- **Successful Save:** the page awaits `mutateAsync` and then navigates away.
  Unmount plus fresh initialization clears the completed builder session.
- **Failed Save:** no navigation or reset occurs. User input remains available
  for correction or retry.
- **New create session:** metadata uses empty name and description, environment
  uses `dev`, provider is empty, default tiers are restored, and every VM array
  is empty.
- **Edit session:** state starts from a defensive clone of persisted data.

`AppMetadataForm` does not need an imperative reset API. Its lifetime follows
the builder. If the component must support an in-place reset in the future, it
should become controlled by builder state rather than receive a reset key.

## Error Handling

- Missing application IDs reject with a descriptive error.
- Malformed JSON rejects as a persistence error rather than appearing as an
  empty successful list.
- Create/update failures keep the current builder state.
- React Query owns pending and error state; UI components render it.
- Storage errors do not trigger navigation.

## Testing

Repository tests cover CRUD, timestamps, not-found behavior, malformed storage,
and isolation between returned values and persisted values.

Hook tests verify repository calls and query invalidation. Page tests verify
navigation after success and no navigation after failure. Builder tests verify
that VM additions do not mutate defaults or initial edit data and that a new
mount starts with empty VM arrays.

## Migration Path

When backend support becomes available:

1. Add `httpRecoveryApplicationRepository.ts` implementing the same contract.
2. Select the HTTP implementation at the API composition boundary.
3. Keep React Query hooks, pages, and builder unchanged.
4. Migrate or discard local data explicitly; do not mix storage sources through
   automatic fallback.

## Non-goals

- Backend implementation or data synchronization.
- Changing the recovery application domain payload.
- Changing the drag-and-drop interaction.
- Adding autosave or draft recovery.
- Refactoring unrelated feature data flows.
