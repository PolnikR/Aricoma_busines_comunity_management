# Task Checklist: Recovery Application Delete with Automatic Rollback

## Task 1 — DELETE API contract + rollback report schema

- [ ] Add `schemas/recoveryApplicationsSchema.ts` with a permissive
  `rollbackReportSchema` (status + optional `airflow`/`ibm` loose sections).
- [ ] Reduce `DeleteRecoveryApplicationRequest` to two variants (drop
  `rollback_orphans`); `true` variant requires both `providerId` and
  `computeProviderId`.
- [ ] Send `provider_id` and `compute_provider_id` only on the `true` variant,
  URL-encoded.
- [ ] Parse the response's `rollback` field with the new schema; return
  `RollbackReport | null`.
- [ ] Test both request variants, an unknown extra rollback section, and
  non-2xx handling.

## Task 2 — Provider derivation and fail-fast errors

- [ ] Make the delete hook accept the selected `RecoveryApplicationListItem`.
- [ ] Fetch `useProviders()` and `usePlatformProviders()` inside the hook.
- [ ] Derive `rollbackFromOrchestrator` from `pushToOrchestrator === true`.
- [ ] Resolve `provider_id` via `getEligiblePlatformProviders()` — exactly one
  match required.
- [ ] Resolve `compute_provider_id` via `getProvidersByTypeAndRole(providers,
  'VMWARE', 'target')` — exactly one match required.
- [ ] Add a `RecoveryApplicationsError` class and specific EN/SK/CS messages
  for: missing/ambiguous AIRFLOW provider, missing/ambiguous VMWARE target
  provider.
- [ ] Reject before any HTTP call when either lookup fails.
- [ ] Return the delete result through `mutateAsync`.

## Checkpoint — Contract and derivation

- [ ] API tests pass.
- [ ] Hook tests pass (pushed 1/1, pushed 0 or 2+ AIRFLOW, pushed 0 or 2+
  VMWARE target, non-pushed).
- [ ] Typecheck passes for the discriminated request.

## Task 3 — Delete UI and result modal

- [ ] Add a danger "Delete" button to the `DetailDrawer` footer, next to
  "Edit".
- [ ] Add a `ConfirmDialog` (danger tone) with a message that depends on
  `pushToOrchestrator`.
- [ ] Track pending state; disable/loading-label the confirm button while
  deleting.
- [ ] Build `RecoveryApplicationRollbackResultModal` (model on
  `RecoveryGroupRollbackResultModal`): success/warning header, DAG id link,
  airflow/ibm status rows, raw JSON fallback.
- [ ] Add `utils/rollbackReport.ts` with `isRollbackClean`.
- [ ] Open the result modal only when a report is returned; no modal for
  plain deletes.
- [ ] Keep failures on the existing mutation-error alert path.
- [ ] Wire `RecoveryApplicationsListPage` to pass the delete mutation and
  pending state to the table.
- [ ] Add EN/SK/CS locale keys for the confirm dialog and result modal.
- [ ] Test pending, rollback-result, plain-success, and failure UI paths.

## Task 4 — Verification

- [ ] Run focused recovery-application API, hook, table, and modal tests.
- [ ] Run `npm run typecheck`.
- [ ] Run focused ESLint.
- [ ] Run `npm run build`.
- [ ] Manually verify one pushed and one non-pushed deletion once a backend
  is available.
- [ ] Confirm no unrelated changes enter the diff.
- [ ] Present the implementation for review before committing.
