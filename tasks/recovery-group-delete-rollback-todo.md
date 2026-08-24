# Task Checklist: Recovery Group Delete with Automatic Rollback

## Task 1 — DELETE API contract

- [ ] Add a discriminated delete request type.
- [ ] Always send `recovery_group_id` and `rollback_from_orchestrator`.
- [ ] Send `provider_id` only for rollback-enabled deletion.
- [ ] Parse plain deletion with `recoveryGroupsResponseSchema`.
- [ ] Parse rollback-enabled deletion with `rollbackResponseSchema`.
- [ ] Return `RollbackReport | null` from the API boundary.
- [ ] Test both request/response variants, malformed responses, and non-2xx.

## Task 2 — Automatic hook mapping

- [ ] Make `remove` accept the selected `RecoveryGroup`.
- [ ] Derive rollback from `group.pushToOrchestrator === true`.
- [ ] Read `provider_id` from `group.orchestrationProviderId`.
- [ ] Reject a pushed group with no orchestration provider before HTTP.
- [ ] Add the specific EN/SK/CS error message.
- [ ] Return the delete result through `mutateAsync`.
- [ ] Invalidate the recovery-group list on success.
- [ ] Test pushed, non-pushed, and inconsistent group states.

## Checkpoint — Contract and decision logic

- [ ] API tests pass.
- [ ] Hook tests pass.
- [ ] Typecheck passes for the discriminated request.
- [ ] Standalone rollback behavior remains unchanged.

## Task 3 — Delete confirmation and result UI

- [ ] Pass the full selected group to `onDelete`.
- [ ] Await deletion from the shared `ConfirmDialog`.
- [ ] Display pending state and prevent duplicate submission.
- [ ] Open the rollback result modal only when a report is returned.
- [ ] Keep plain deletion free of a result modal.
- [ ] Keep failures on the existing mutation-error path.
- [ ] Preserve standalone rollback report rendering.
- [ ] Test pending, true, false, and failure UI paths.

## Task 4 — Verification

- [ ] Run focused recovery-group API, hook, table, and modal tests.
- [ ] Run `npm run typecheck`.
- [ ] Run focused ESLint.
- [ ] Run `npm run build`.
- [ ] Manually verify one pushed and one non-pushed deletion.
- [ ] Confirm no unrelated recovery-application changes enter the diff.
- [ ] Present the implementation for review before committing.
