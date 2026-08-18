# Implementation Plan: Recovery Application Delete with Automatic Orchestrator Rollback

## Overview

Add a delete action to the recovery-applications table, matching the `DELETE
/delete_recovery_app` contract read from `openapi/abco-api.json`. The frontend
derives `rollback_from_orchestrator` from the selected application's
`pushToOrchestrator` flag, exactly as the existing recovery-group delete flow
does. Unlike recovery groups, this endpoint also requires two provider IDs
whenever rollback is enabled (`provider_id`, the AIRFLOW provider, and
`compute_provider_id`, a VMWARE provider with `role=target`) and neither is
stored on the recovery-application record. Both are resolved client-side from
the already-fetched providers lists instead of waiting on a backend change.

`rollback_orphans` (tearing down a leftover Airflow run with no local record)
is explicitly out of scope — there is no UI entry point for it and it is a
separate maintenance action, not part of deleting a listed application.

## API Contract

```text
DELETE /api/delete_recovery_app

Always:
  recovery_app_id=<app.id>
  rollback_from_orchestrator=<true|false>

Only when rollback_from_orchestrator=true:
  provider_id=<sole eligible AIRFLOW platform provider>
  compute_provider_id=<sole eligible VMWARE provider with role=target>
```

Response is `RecoveryAppsResponse` (`{ applications: [...], rollback?:
RollbackReport | null }`). The generated Zod `RollbackReport` only pins down
`status`; a hand-written, permissive schema is needed to preserve the
`airflow`/`ibm` (and any future) sections for display, the same reason
recovery-groups has its own `rollbackReportSchema` instead of using the
generated one.

## Architecture Decisions

- **Provider derivation, not stored fields.** `RecoveryAppRecord` has no
  `orchestration_provider_id` or any target-compute-provider field (confirmed
  against `openapi/abco-api.json`). Rather than blocking on a backend change
  (as recovery-groups did for `orchestration_provider_id`), resolve both IDs
  client-side:
  - AIRFLOW provider: `getEligiblePlatformProviders(platformProviders)`.
  - VMWARE target provider: `getProvidersByTypeAndRole(providers, 'VMWARE',
    'target')`.
  Confirmed with the user as the intended approach for both lookups.
- **Zero or multiple matches both fail before the HTTP call.** If either
  lookup does not resolve to exactly one provider, throw a specific translated
  error and make no request — never guess which provider to use for a
  destructive rollback. Mirrors the recovery-group precedent of failing fast
  on `missing_orchestration_provider` rather than silently downgrading.
- **Discriminated request type**, mirroring `DeleteRecoveryGroupRequest`:
  ```text
  DeleteRecoveryApplicationRequest
    ├─ rollbackFromOrchestrator: false
    │  └─ recoveryAppId
    └─ rollbackFromOrchestrator: true
       ├─ recoveryAppId
       ├─ providerId
       └─ computeProviderId
  ```
  The `rollback_orphans` variant present in the current draft implementation
  is removed; it has no caller and is out of scope.
- **Derivation lives in the hook**, not the table. `RecoveryApplicationsTable`
  passes the selected `RecoveryApplicationListItem`; `useDeleteRecoveryApplication`
  converts it (plus the providers it fetches itself, matching how
  `RecoveryGroupsTable` self-fetches `usePlatformProviders()`) into the
  discriminated request.
- **New `RecoveryApplicationRollbackResultModal`**, modeled directly on
  `RecoveryGroupRollbackResultModal` (same `isRollbackClean` shape, same raw-JSON
  fallback block) rather than trying to generalize the existing group-specific
  component. Reusing it as-is is not on the table because it imports the
  recovery-groups schema module and is named/labeled for groups.
- **UI placement**: a danger "Delete" button in the `DetailDrawer` footer next
  to "Edit" — `RecoveryApplicationsTable` has no context menu today (unlike
  recovery-groups), so no menu is introduced for this.
- Keep deletion asynchronous through `mutateAsync`; bind the shared
  `ConfirmDialog`'s loading state to it; close the dialog only after success or
  a handled failure, and open the result modal only when a report is returned.

## Dependency Graph

```text
Task 1: typed DELETE request/response contract + rollback report schema
    │
    └── Task 2: provider derivation + fail-fast error handling in the hook
            │
            └── Task 3: delete UI in the table + rollback result modal
                    │
                    └── Task 4: regression and production verification
```

## Task 1: Tighten the delete API contract and add the rollback report schema

**Description:** Reduce `DeleteRecoveryApplicationRequest` to the two valid
variants (drop the `rollback_orphans` variant), add
`schemas/recoveryApplicationsSchema.ts` with a permissive `rollbackReportSchema`
modeled on the recovery-groups one, and change `deleteRecoveryApplication` to
parse the response with it and return `RollbackReport | null`.

**Acceptance criteria:**
- [ ] `DeleteRecoveryApplicationRequest` only has the `false` and
  `true`-with-both-provider-ids variants; TypeScript rejects a `true` variant
  missing either provider ID.
- [ ] A plain-delete response (`rollback` absent/null) returns `null`.
- [ ] A rollback-enabled response returns the parsed `RollbackReport` (status
  plus any `airflow`/`ibm` sections present), surviving unknown keys.
- [ ] Non-2xx responses reject with the existing `Failed to delete recovery
  application: ...` error wrapping.

**Verification:**
- [ ] Run `npm exec vitest run src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`.
- [ ] Assert exact query parameters for both request variants (URL-encoded,
  `provider_id`/`compute_provider_id` present only on the `true` variant).
- [ ] Assert a response with an unknown extra rollback section still parses.

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/api/schemas/recoveryApplicationsSchema.ts` (new)
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Estimated scope:** Medium — 3 files

## Task 2: Derive rollback provider IDs and fail fast when they can't be resolved

**Description:** Change `useDeleteRecoveryApplication` to accept the selected
`RecoveryApplicationListItem`, fetch `useProviders()` and
`usePlatformProviders()` itself, and build the discriminated request:
`rollbackFromOrchestrator: false` when `pushToOrchestrator` is not `true`;
otherwise resolve the sole eligible AIRFLOW provider and the sole eligible
VMWARE `role=target` provider, throwing a new `RecoveryApplicationsError`
(mirroring `RecoveryGroupsError`) before any HTTP call if either resolves to
zero or more than one match.

**Acceptance criteria:**
- [ ] A non-pushed application calls the API with `rollbackFromOrchestrator:
  false` and no provider IDs.
- [ ] A pushed application with exactly one eligible AIRFLOW provider and one
  eligible VMWARE target provider calls the API with both IDs.
- [ ] A pushed application with zero or 2+ eligible AIRFLOW providers fails
  locally with a specific translated error and makes no HTTP call.
- [ ] A pushed application with zero or 2+ eligible VMWARE target providers
  fails locally with a specific translated error and makes no HTTP call.
- [ ] Successful deletion invalidates/updates the recovery-application list
  and resolves with `RollbackReport | null`.

**Verification:**
- [ ] Run `npm exec vitest run src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.tsx`.
- [ ] Test pushed (1/1 providers), pushed (0 or 2+ AIRFLOW), pushed (0 or 2+
  VMWARE target), and non-pushed cases.
- [ ] Confirm the new error messages resolve in EN, SK, and CS.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.ts`
- `src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.tsx` (new)
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsErrors.ts` (new)
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`

**Estimated scope:** Medium — 5 files

## Checkpoint: Contract and provider derivation

- [ ] Focused API and hook tests pass.
- [ ] TypeScript prevents a rollback-enabled request without both provider IDs.
- [ ] No delete request can silently proceed for a pushed application with an
  ambiguous or missing provider.

## Task 3: Delete confirmation, result modal, and page wiring

**Description:** Add a danger "Delete" button to the `DetailDrawer` footer in
`RecoveryApplicationsTable`, a `ConfirmDialog` whose message depends on
`pushToOrchestrator`, and a new `RecoveryApplicationRollbackResultModal`
(modeled on `RecoveryGroupRollbackResultModal`) shown only when a report is
returned. Wire `RecoveryApplicationsListPage` to supply the delete mutation and
its pending state.

**Acceptance criteria:**
- [ ] The confirm button shows a loading label and is disabled while deletion
  is pending.
- [ ] A rollback-enabled successful delete closes the confirmation dialog,
  clears the drawer selection, and opens the result modal with the report.
- [ ] A plain successful delete closes confirmation and opens no result modal.
- [ ] A failed delete opens no modal and surfaces through the existing
  mutation-error alert; the confirmation dialog closes.
- [ ] Existing edit, filter, JSON-viewer, and pagination behavior is
  unaffected.

**Verification:**
- [ ] Run `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`.
- [ ] Run `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx`.
- [ ] Run `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx`.
- [ ] Manually delete one pushed and one non-pushed application against the
  updated API (or a mocked backend) once available.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.tsx` (new)
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx` (new)
- `src/features/recovery-plans/recovery-applications/utils/rollbackReport.ts` (new — `isRollbackClean`, mirrors recovery-groups)
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx`
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`

**Estimated scope:** Large — 8 files (still one vertical slice; no further
split point without leaving the UI half-wired)

## Task 4: Run regression and production verification

**Description:** Verify the complete recovery-application deletion flow and
the project's quality gates, touching only the files approved by this plan.

**Acceptance criteria:**
- [ ] Pushed and non-pushed applications produce the expected query strings
  and UI outcomes end to end.
- [ ] Response parsing rejects contract drift instead of showing false success.
- [ ] Existing create, update, submit-to-orchestrator, list refresh, and table
  interactions do not regress.
- [ ] The production build succeeds and the diff contains only the files
  listed above plus these plan documents.

**Verification:**
- [ ] Run all focused recovery-application API, hook, table, and modal tests
  touched by this plan.
- [ ] Run `npm run typecheck`.
- [ ] Run focused ESLint for changed recovery-application and locale files.
- [ ] Run `npm run build` or record unrelated pre-existing failures exactly.
- [ ] Inspect `git diff` and exclude unrelated in-progress work.

**Dependencies:** Task 3

**Files likely touched:** No production files expected; verification only.

**Estimated scope:** Small — verification only

## Checkpoint: Complete

- [ ] Delete requires no query params beyond `recovery_app_id` and
  `rollback_from_orchestrator` for a non-pushed application.
- [ ] A pushed application's rollback provider IDs are always resolved from
  the current providers lists, never hardcoded or guessed.
- [ ] Rollback details appear only when the backend returns them.
- [ ] Plain deletion does not show an empty or misleading result modal.
- [ ] Focused tests, typecheck, lint, and production build pass or unrelated
  failures are documented.
- [ ] Ready for user review before commit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| More than one eligible AIRFLOW or VMWARE target provider exists in some environments | High | Fail before HTTP with a specific error rather than picking one; revisit if this becomes common (may need a backend-stored ID after all). |
| Backend later adds a stored provider field to `RecoveryAppRecord`, making the derivation redundant | Low | Client-side lookup can be swapped for the stored field later; no consumer outside the hook depends on the derivation strategy. |
| Unknown rollback report shape for applications (no sample response seen) | Medium | Permissive `z.looseObject()` schema, same strategy as recovery-groups; raw JSON always rendered as a fallback. |
| `rollback_orphans` need surfaces later | Low | Explicitly deferred; would be a separate, standalone action, not a change to this delete flow. |

## Open Questions

None outstanding — see the brainstorming discussion in this session for the
resolved decisions: provider derivation (client-side lookup, not stored
fields), zero/multiple-match handling (block with a specific error), and
`rollback_orphans` scope (deferred).
