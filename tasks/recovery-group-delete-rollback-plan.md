# Implementation Plan: Recovery Group Delete with Automatic Orchestrator Rollback

## Overview

Extend the existing recovery-group delete flow to match the updated backend
contract. Every delete request sends `recovery_group_id` and
`rollback_from_orchestrator`. The frontend derives the rollback flag from the
selected recovery group instead of asking the user:

- `pushToOrchestrator === true` sends `rollback_from_orchestrator=true` and
  `provider_id=<group.orchestrationProviderId>`.
- Every other group sends `rollback_from_orchestrator=false` and omits
  `provider_id`.

When a rollback-enabled delete returns a `rollback` report, the UI displays it
in the existing rollback-result modal pattern built from shared `Modal`,
`Button`, `Badge`, and `DetailRow` components. A normal delete receives only
`recovery_groups`, closes the confirmation dialog, and does not open a result
modal.

The existing standalone **Rollback from orchestrator** operation remains
unchanged.

## API Contract

```text
DELETE /api/delete_recovery_group

Always:
  recovery_group_id=<group.id>
  rollback_from_orchestrator=<true|false>

Only when rollback_from_orchestrator=true:
  provider_id=<group.orchestrationProviderId>
```

Use a discriminated TypeScript input so an enabled rollback cannot be created
without `providerId`:

```text
DeleteRecoveryGroupRequest
  ├─ rollbackFromOrchestrator: false
  │  └─ recoveryGroupId
  └─ rollbackFromOrchestrator: true
     ├─ recoveryGroupId
     └─ providerId
```

Validate the response against the branch that was requested:

- rollback disabled: `recoveryGroupsResponseSchema`
- rollback enabled: `rollbackResponseSchema`, returning its `rollback` report

Do not trust the presence or absence of `rollback` without Zod validation. The
API layer should expose a stable result such as `RollbackReport | null`; the UI
does not need the returned `recovery_groups` because React Query invalidates and
reloads the authoritative list after success.

## Architecture Decisions

- Automatic rollback selection belongs in the recovery-groups hook/domain
  boundary, not in `RecoveryGroupsTable`. The table passes the selected
  `RecoveryGroup`; the hook converts its canonical camelCase fields to the API
  request contract.
- `provider_id` is the backend query-parameter name, but its value comes only
  from `RecoveryGroup.orchestrationProviderId`.
- If `pushToOrchestrator` is true while `orchestrationProviderId` is missing,
  fail before making the HTTP request and expose a specific translated recovery
  group error. Never silently downgrade to `rollback_from_orchestrator=false`,
  because that could delete the group while leaving orchestrator artifacts.
- Reuse `RecoveryGroupRollbackResultModal` for report rendering. Extend it with
  a delete context only if delete-specific title/description copy is needed;
  keep the report details and shared UI primitives in one implementation.
- Keep deletion asynchronous through `mutateAsync`, show the existing shared
  confirmation dialog in a loading state, and prevent repeated submissions.
- Close the confirmation dialog only after success or after a handled failure.
  On failure, do not open the result modal; the existing page-level mutation
  alert remains the error surface.

## Dependency Graph

```text
Task 1: typed DELETE request/response contract
    │
    └── Task 2: automatic hook mapping and cache lifecycle
            │
            └── Task 3: awaited delete UI and conditional result modal
                    │
                    └── Task 4: regression and production verification
```

## Task 1: Implement the typed delete API contract

**Description:** Define the two valid delete request variants, construct the
updated query string, validate the conditional response shape, and return a
rollback report only for rollback-enabled deletion. Write focused API tests
before changing the implementation.

**Acceptance criteria:**

- [ ] Every request contains `recovery_group_id` and
  `rollback_from_orchestrator`.
- [ ] `provider_id` is present only for the `true` variant and is URL-encoded.
- [ ] A `false` response is validated as `{ recovery_groups: [...] }` and
  returns no rollback report.
- [ ] A `true` response requires and returns the validated `rollback` report.
- [ ] Non-2xx and malformed conditional responses reject without mutating UI
  state.

**Verification:**

- [ ] Run `npm test -- src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`.
- [ ] Assert exact query parameters for both request variants.
- [ ] Assert that a `true` response without `rollback` fails validation.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Estimated scope:** Medium — 3 files

## Task 2: Derive delete behavior from the selected recovery group

**Description:** Change the delete mutation to accept a `RecoveryGroup`, derive
the discriminated API request from `pushToOrchestrator`, source `providerId`
from `orchestrationProviderId`, and return the optional rollback report through
`mutateAsync`.

**Acceptance criteria:**

- [ ] A group with `pushToOrchestrator === true` calls the API with rollback
  enabled and its `orchestrationProviderId`.
- [ ] Any other group calls the API with rollback disabled and no provider ID.
- [ ] A pushed group without `orchestrationProviderId` fails locally with a
  specific translated error and makes no HTTP call.
- [ ] Successful deletion invalidates the recovery-group list exactly once and
  resolves with `RollbackReport | null`.

**Verification:**

- [ ] Run `npm test -- src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`.
- [ ] Test pushed, non-pushed, and inconsistent pushed-without-provider groups.
- [ ] Confirm mutation error mapping resolves in EN, SK, and CS.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsErrors.ts`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium — 6 focused files

## Checkpoint: Contract and automatic decision

- [ ] Focused API and hook tests pass.
- [ ] TypeScript prevents `rollbackFromOrchestrator: true` without `providerId`.
- [ ] No delete request can silently skip rollback for a pushed group.
- [ ] Standalone rollback tests still pass.

## Task 3: Await deletion and show the rollback result conditionally

**Description:** Pass the selected group through the table delete callback,
await the mutation from the existing shared confirmation dialog, and display
the validated report only when rollback was performed. Reuse the existing
rollback result presentation and shared UI components.

**Acceptance criteria:**

- [ ] The confirm button is disabled and shows a loading label while deletion
  is pending, preventing duplicate DELETE requests.
- [ ] A rollback-enabled successful delete closes confirmation, clears stale
  selection/menu state, and opens the result modal with the deleted group name
  and returned Airflow/IBM report.
- [ ] A rollback-disabled successful delete closes confirmation and opens no
  report modal.
- [ ] A failed delete opens no success/result modal and remains visible through
  the existing mutation-error alert.
- [ ] The existing standalone rollback action and result modal still behave as
  before.

**Verification:**

- [ ] Run `npm test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`.
- [ ] Run `npm test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`.
- [ ] Add tests for pending, rollback-result, plain-success, and failure paths.
- [ ] Manually delete one pushed and one non-pushed recovery group against the
  updated API.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`

**Estimated scope:** Medium — 5 files

## Task 4: Run regression and production verification

**Description:** Verify the complete recovery-group deletion flow and project
quality gates without including the unrelated dirty recovery-application work
in the change.

**Acceptance criteria:**

- [ ] Pushed and non-pushed groups produce the expected query strings and UI
  outcomes end to end.
- [ ] Response parsing rejects contract drift instead of showing false success.
- [ ] Existing create, update, standalone rollback, list refresh, and table
  interactions do not regress.
- [ ] The production build succeeds and the diff contains only approved
  recovery-group delete files, translations, tests, and these plan documents.

**Verification:**

- [ ] Run all focused recovery-group API, hook, table, and modal tests.
- [ ] Run `npm run typecheck`.
- [ ] Run focused ESLint for changed recovery-group and locale files.
- [ ] Run `npm run build` or record unrelated pre-existing failures exactly.
- [ ] Inspect `git diff` and exclude the existing recovery-application changes.

**Dependencies:** Task 3

**Files likely touched:** No production files expected; verification fixes only
within the approved scope.

**Estimated scope:** Small — verification only

## Checkpoint: Complete

- [ ] Updated backend delete contract is represented by explicit frontend
  input and output types.
- [ ] Rollback selection is automatic and deterministic.
- [ ] `provider_id` always comes from the selected group's
  `orchestrationProviderId`.
- [ ] Rollback details appear only when the backend returns them for a
  rollback-enabled deletion.
- [ ] Plain deletion does not show an empty or misleading result modal.
- [ ] Focused tests, typecheck, lint, and production build pass or unrelated
  failures are documented.
- [ ] Ready for user review before commit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Pushed group lacks `orchestrationProviderId` | High | Fail before HTTP and show a specific error; never silently delete without rollback. |
| Backend returns the wrong conditional response | High | Parse with the schema selected by the request variant; require `rollback` for `true`. |
| User submits delete repeatedly | Medium | Await `mutateAsync` and bind mutation pending state to shared `ConfirmDialog`. |
| Deletion succeeds but report modal is lost during refetch | Medium | Capture the returned report in local modal state before/while invalidating the list. |
| Existing standalone rollback behavior regresses | Medium | Reuse its report component and retain its focused tests as a regression gate. |
| Unrelated recovery-application edits are included | High | Touch and stage only explicit recovery-group, locale, test, and plan files. |

## Open Questions

None. Automatic behavior is approved: use `pushToOrchestrator` as the flag and
`orchestrationProviderId` as the conditional backend `provider_id` value.
