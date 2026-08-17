# Implementation plan: Recovery Groups API readiness

## Phase 1: Domain and local persistence

### Task 1: Make resource configuration discriminated

Replace independently optional type fields with a discriminated domain
configuration and shared validation helpers.

Acceptance criteria:
- Only VMware/VM and FlashSystem/Volume combinations compile and validate.
- Required strings and unique non-empty resources are validated.
- Derived fields are not trusted from input.

### Task 2: Harden the localStorage adapter

Split persistence concerns from the public API facade.

Acceptance criteria:
- Legacy records migrate.
- Invalid individual records do not hide valid records.
- Invalid JSON raises a typed error.
- Status and resource count are recomputed.

### Checkpoint

- Domain and persistence tests pass.
- Existing stored records remain readable.

## Phase 2: Async API and cache

### Task 3: Add async Recovery Groups API facade

Expose Promise-based fetch/create/update/delete functions backed by the local
adapter.

Acceptance criteria:
- Function signatures match a future HTTP API.
- Update rejects type changes.
- Errors use stable codes.

### Task 4: Rebuild useRecoveryGroups with React Query

Use a query and mutations as the single client cache.

Acceptance criteria:
- Create never duplicates a row.
- CRUD invalidates or updates one query cache.
- Storage events synchronize tabs.
- Loading, mutation and error states are exposed.

### Checkpoint

- Hook tests cover CRUD, duplicate prevention and storage events.
- Lint and typecheck pass.

## Phase 3: UI migration

### Task 5: Migrate list/create/edit pages

Adapt pages to async operations and add loading/error states.

Acceptance criteria:
- Submit is disabled while saving.
- Query and mutation failures are visible and translated.
- Successful operations navigate once.

### Task 6: Lock type during edit

Render the saved type as read-only and enforce immutability in the API.

Acceptance criteria:
- Existing group type cannot be changed through UI or direct API call.
- Name, description and resources remain editable.

### Task 7: Split resource inventory by workload

Mount the VMware inventory consumer only for VMware groups.

Acceptance criteria:
- FlashSystem selection performs no discovery-inventory request.
- VMware loading/error/retry behavior remains intact.

## Phase 4: Verification

### Task 8: Complete feature tests

Add missing builder, hook and page integration coverage.

Acceptance criteria:
- Required fields, duplicate IDs and dirty state are tested.
- Corrupt persistence and immutable edit type are tested.
- Full feature tests, full lint, typecheck and production build pass.

