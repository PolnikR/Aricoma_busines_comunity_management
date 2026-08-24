# Implementation Plan: Global Backend Error Message Display

## Overview

Standardize user-visible backend errors across backend-backed frontend areas so the existing error UI shows the real backend problem instead of generic or status-only wrapper text. The implementation uses a shared extraction/resolution boundary that reads supported structured backend detail from `OrvalApiError` or its preserved `Error.cause` chain, then rolls that boundary through existing shared `Alert`, `FetchErrorAlert`, and `DataTableRequestState` seams. `Discovery & Inventory > Resources` and `Resources ISE` are explicitly excluded from this rollout.

Specification: `docs/superpowers/specs/2026-08-21-backend-error-message-display-spec.md`

## Architecture Decisions

- Add one shared API error boundary with `extractBackendErrorDetail(error)` and `resolveUserFacingErrorMessage(error, fallback)` instead of changing every Orval API wrapper independently.
- Preserve `OrvalApiError`, existing wrapper errors, and `cause` chains for diagnostics; UI resolution is additive.
- Supported backend body formats are `{ detail: string }` and FastAPI `{ detail: [{ msg: string, ... }] }`. Plain-text bodies are rejected until the transport preserves a trustworthy media type/user-safe contract.
- Never JSON-stringify arbitrary backend objects or display plain-text/HTML API bodies in user-facing UI.
- Traverse cause chains with identity-based cycle detection and a maximum depth of 10; nested API identity takes precedence over synthetic outer wrapper messages.
- API errors with no supported backend text use the caller's existing localized fallback rather than a synthetic status-only wrapper.
- Ordinary non-API `Error.message` values remain valid for intentional client/domain errors, while feature domain adapters such as `RecoveryGroupsError` localization retain precedence.
- Mutation/action failures keep a localized contextual `Alert variant="error"` title and add backend detail as `description`; list/detail fetch failures keep contextual shared retry UI and likewise add backend detail as `description`.
- Audit native `fetch` seams separately; the credential public-key request must stop exposing a status-only message because it does not currently preserve `OrvalApiError.body`.
- Keep Resources and Resources ISE source/API/UI untouched. Infrastructure Topology is a separate route and remains in scope.
- Do not modify mock-only Identity & Access or Recovery Actions flows.

## Dependency Graph

```text
Shared backend error boundary + unit tests
                |
                +--------------------+---------------------+---------------------+
                |                    |                     |                     |
          Providers/Creds      Platform Providers     Recovery Plans       Infrastructure
                |                    |                     |                     |
                +--------------------+----------+----------+---------------------+
                                               |
                                      Cross-feature audit/build
```

All feature slices depend on Task 1. After Task 1, independent feature slices may be implemented in parallel as long as they do not touch the excluded Resources/Resources ISE paths.

## Task 1: Add the shared backend error boundary

**Description:** Create a shared API/error utility with two explicit operations: optional backend-detail extraction for descriptions and non-empty user-facing resolution for mutation/client seams. It must handle direct or nested `OrvalApiError` values safely, preserve intentional ordinary client/domain errors, and use a supplied fallback when an API response has no usable structured backend detail.

**Acceptance criteria:**
- [ ] `detail: string` and FastAPI `detail[].msg` resolve through direct and nested `cause` chains; values are trimmed and validation messages retain response order.
- [ ] Plain-text/HTML and unsupported API bodies do not leak into UI; API-without-detail uses caller fallback while ordinary non-API `Error.message` remains usable.
- [ ] Cause cycles terminate, traversal stops after depth 10, and a nested API error suppresses a synthetic outer status-wrapper message.
- [ ] Existing `OrvalApiError`/`toOrvalRequestError` behavior and diagnostic cause chains remain unchanged.

**Verification:**
- [ ] Focused shared resolver tests cover supported shapes, rejected text/HTML/arbitrary objects, direct/nested API errors, cycle/depth behavior, ordinary errors, and fallbacks.
- [ ] Existing `orvalMutator` tests remain green.
- [ ] Focused ESLint + `tsc -b` + `git diff --check` pass.

**Dependencies:** None

**Files likely touched:**
- `src/shared/api/apiErrorMessage.ts` (new)
- `src/shared/api/apiErrorMessage.test.ts` (new)
- optionally the shared API barrel if one exists/needs export

**Estimated scope:** Small

## Task 2: Make Recovery Groups the reference integration

**Description:** Wire the shared resolver through Recovery Groups first because it is the concrete failing example. The list mutation banner keeps its localized action title and adds backend detail as description; builder/editor submit errors resolve backend messages without bypassing `RecoveryGroupsError` localization; list-load retry state keeps its contextual title and adds backend detail as description.

**Acceptance criteria:**
- [ ] Recovery group mutation errors keep the localized shared `Alert` title and display supported backend detail as description.
- [ ] Builder/editor save failures use backend detail for API errors while domain `RecoveryGroupsError` values continue through `getRecoveryGroupsErrorKey()` and existing validation behavior remains unchanged.
- [ ] Recovery Groups list fetch errors keep Retry/context title and display backend detail when present.

**Verification:**
- [ ] `RecoveryGroupsListPage` regression test proves a nested backend `detail` appears below the existing localized operation title.
- [ ] Builder/editor tests prove localized `RecoveryGroupsError` mappings are unchanged.
- [ ] Recovery Groups table/builder/editor focused tests cover backend detail and fallback behavior.
- [ ] Existing delete/rollback success tests remain green.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`

**Estimated scope:** Medium

## Checkpoint: Foundation + Recovery Groups

- [ ] Shared resolver tests pass.
- [ ] Recovery Groups focused tests pass.
- [ ] Manual check: reproduce a Recovery Groups backend mutation error and confirm the existing red banner shows the backend problem.
- [ ] No file under the Resources/Resources ISE feature flow changed.

## Task 3: Apply the resolver to infrastructure Providers

**Description:** Standardize provider list/detail/create/edit/delete/connection-test request errors. Keep current table/detail/modal/dialog structure, but surface backend detail. Add a visible shared mutation alert for provider delete failures that are currently only stored in the mutation state.

**Acceptance criteria:**
- [ ] Provider create/edit and delete request failures use shared error UI with backend detail when available.
- [ ] Provider list/detail fetch errors keep contextual title/Retry and display backend detail as description.
- [ ] Provider connection-test transport failures display backend detail, while HTTP-success responses with failed checks continue to show the backend check list normally.

**Verification:**
- [ ] Existing Providers create/modal, catalogue-table, detail, and connection-test component seams cover the changed behavior.
- [ ] Successful provider CRUD and connection-test tests remain green.
- [ ] Focused ESLint for changed provider files passes.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx`
- existing focused provider component tests

**Estimated scope:** Medium

## Task 4: Apply the resolver to Credentials

**Description:** Extend the existing Credentials behavior so create/edit/delete/list errors use the shared resolver and shared alert/request-state pattern. This also fixes standard FastAPI 422 `detail[]` responses, which the current credentials-specific `detail: string` adapter cannot promote by itself. Migrate the native credential public-key request to a body-preserving error seam or a safe localized fallback so create failures cannot expose only `status N`.

**Acceptance criteria:**
- [ ] Credential create/edit/delete backend detail is visible through shared `Alert`; raw red submit blocks are removed.
- [ ] Credentials list errors keep the current table Retry UI and add backend detail when available.
- [ ] `detail[]` validation messages are recovered from the nested original API error without requiring a credentials transport rewrite.
- [ ] Public-key request failures never show a synthetic status-only message; supported structured detail is preserved when available, otherwise the localized credential fallback is used.

**Verification:**
- [ ] Existing Credentials table/delete regression seam verifies backend detail.
- [ ] Add/extend a safe Credential modal seam for submit errors if the protected adjacent test path cannot be edited through Rel.AI.
- [ ] `credentialsCrypto` tests cover public-key HTTP failure detail/fallback without exposing raw text/HTML bodies.
- [ ] Successful encrypt/create/edit/delete behavior remains unchanged.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/credentials/components/CredentialCreateModal.tsx`
- `src/features/providers-connectors/credentials/components/CredentialsTable.tsx`
- `src/features/providers-connectors/credentials/api/credentialsCrypto.ts`
- `src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts`
- `src/features/providers-connectors/TableMutationError.test.tsx`
- focused credential modal test seam if needed

**Estimated scope:** Medium

## Task 5: Apply the resolver to Platform Providers

**Description:** Standardize platform-provider list/save/delete errors. Convert the modal's raw red submit block to shared `Alert`, add backend detail to list-load retry state, and expose delete mutation failures in table context.

**Acceptance criteria:**
- [ ] Save/delete failures display backend detail through shared `Alert` with existing translations as fallback.
- [ ] List-load failures retain existing contextual title/Retry and display backend detail as description.
- [ ] Successful create/edit/delete behavior and modal layout remain unchanged.

**Verification:**
- [ ] Extend existing Platform Providers modal/table tests for backend detail and delete failure.
- [ ] Existing layout/single-tag/provider-type tests remain green.
- [ ] Focused ESLint passes.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`
- existing Platform Providers table test seam

**Estimated scope:** Medium

## Checkpoint: Provider Administration

- [ ] Providers, Credentials, and Platform Providers focused tests pass.
- [ ] All mutation errors in those areas use shared `Alert` rather than one-off red backend-error blocks.
- [ ] `tsc -b` and focused ESLint pass.

## Task 6: Apply the resolver to Recovery Applications

**Description:** Standardize Recovery Applications list-load, builder/editor submit, delete, and supporting lookup errors. Keep existing error components and recovery rollback/result behavior. Delete failures that are currently caught without a visible message must become a shared mutation alert in the list context.

**Acceptance criteria:**
- [ ] Builder/editor submit and list delete failures display backend detail through shared `Alert`.
- [ ] List/detail/supporting lookup fetch errors keep contextual Retry UI and show backend detail as description when present.
- [ ] Frontend generated-response contract diagnostics remain visible for non-API parse errors.

**Verification:**
- [ ] Recovery Applications table/list/builder/editor focused tests cover request detail and delete failure.
- [ ] Existing rollback-report and successful submit/delete tests remain green.
- [ ] Existing response-contract diagnostic test is updated only where required by the new display rule.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`

**Estimated scope:** Medium

## Task 7: Apply the resolver to Policy Sets

**Description:** Standardize Policy Sets list/save/delete and dependent-policy lookup errors. Replace the modal's raw submit-error block with shared `Alert`, expose delete mutation failure, and add backend detail to retryable fetch states.

**Acceptance criteria:**
- [ ] List/save/delete failures display the real backend message when supported.
- [ ] Recovery-app-policy and clean-room-policy lookup failures retain Retry and show backend detail when available.
- [ ] Existing policy-set validation and picker behavior remain unchanged.

**Verification:**
- [ ] Update `PolicySetsTable` tests that currently assert backend detail is hidden.
- [ ] Extend PolicySet modal/form seams for submit/dependent-fetch failures.
- [ ] Existing policy-set CRUD success tests remain green.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx`
- focused PolicySet modal/form test seam

**Estimated scope:** Medium

## Task 8: Apply the resolver to Snapshot Policies

**Description:** Standardize Snapshot Policies list/save/delete errors using the shared resolver and shared Alert/request-state components.

**Acceptance criteria:**
- [ ] List fetch errors show backend detail as description while preserving Retry/context title.
- [ ] Save and delete mutation failures show backend detail through shared `Alert`.
- [ ] Existing filters, JSON view, validation, and success paths remain unchanged.

**Verification:**
- [ ] Update Snapshot Policies tests that currently hide backend detail.
- [ ] Add focused delete/submit failure assertions.
- [ ] Focused ESLint passes.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.tsx`
- focused SnapshotPolicy modal test seam

**Estimated scope:** Medium

## Task 9: Apply the resolver to Recovery App Policies

**Description:** Standardize Recovery App Policy list/save/delete errors through the same shared resolver and UI patterns.

**Acceptance criteria:**
- [ ] List fetch errors retain Retry/context and show backend detail as description.
- [ ] Save/delete mutation failures display backend detail through shared `Alert`.
- [ ] Existing policy selection/filter/JSON behaviors remain unchanged.

**Verification:**
- [ ] Extend Recovery App Policy table/modal tests for supported backend detail and fallback.
- [ ] Existing successful policy workflows remain green.
- [ ] Focused ESLint passes.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.tsx`
- focused modal test seam

**Estimated scope:** Medium

## Task 10: Apply the resolver to Clean Room Policies

**Description:** Standardize Clean Room Policy list/save/delete errors and update tests that currently intentionally hide backend details.

**Acceptance criteria:**
- [ ] List fetch errors retain Retry/context and show backend detail as description.
- [ ] Save/delete mutation failures display backend detail through shared `Alert`.
- [ ] Unsupported backend objects remain hidden and use the localized fallback.

**Verification:**
- [ ] Update Clean Room Policies table tests from "hide backend detail" to the new supported-detail behavior.
- [ ] Add focused modal/delete failure coverage.
- [ ] Existing successful policy workflows remain green.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPolicyModal.tsx`
- focused modal test seam

**Estimated scope:** Medium

## Checkpoint: Recovery Plan Configuration

- [ ] Recovery Applications, Policy Sets, Snapshot Policies, Recovery App Policies, and Clean Room Policies focused tests pass.
- [ ] No supported backend `detail` is replaced by a generic mutation message in these feature areas.
- [ ] `tsc -b`, focused ESLint, and `git diff --check` pass.

## Task 11: Apply the resolver to Recovery Runs

**Description:** Add resolved backend detail to the existing Recovery Runs retryable table error state. There are no new mutation semantics in this task.

**Acceptance criteria:**
- [ ] Failed orchestrator-runs requests keep the current contextual title and Retry action.
- [ ] Supported backend detail is visible as the error description.
- [ ] Empty/no-run successful states remain unchanged.

**Verification:**
- [ ] Extend `RecoveryRunsTable` focused test coverage for backend detail and fallback.
- [ ] Existing status/pagination/filter tests remain green.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`
- `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`

**Estimated scope:** Small

## Task 12: Apply the resolver to Infrastructure Topology

**Description:** Standardize backend provider/topology fetch errors on the Infrastructure Topology route. This task explicitly does not touch the Resources or Resources ISE route components or their resource API adapters. Client-only ELK/layout errors remain unchanged.

**Acceptance criteria:**
- [ ] Provider/topology HTTP failures show backend detail in the existing full retry alert.
- [ ] Client-only topology layout errors retain their current local error message behavior.
- [ ] No file under `src/features/discovery-inventory/resources/` is changed by this task.

**Verification:**
- [ ] Extend `InfrastructurePage` tests for nested backend detail and fallback.
- [ ] Existing topology rendering/layout tests remain green.
- [ ] Confirm task diff contains no Resources/Resources ISE files.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.tsx`
- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.test.tsx`
- only infrastructure-specific API/error seam if required after implementation review

**Estimated scope:** Small

## Task 13: Perform the global error-surface audit and release verification

**Description:** Re-scan backend-backed feature UI outside Resources/Resources ISE for synthetic status-only user-facing errors, unsafe text/HTML bodies, raw backend-error red blocks, native-fetch seams, and mutation errors that are still silently swallowed. Record every omission. If an omission requires more than a surgical change in an already-owned Task 2-12 file, add a follow-up task instead of expanding this audit into an unbounded implementation task, then run cross-feature verification.

**Acceptance criteria:**
- [ ] No in-scope backend mutation error surface shows `...request failed with status N` when supported backend detail exists.
- [ ] No in-scope backend mutation error uses a one-off raw red block where shared `Alert` is appropriate.
- [ ] No in-scope UI displays an arbitrary plain-text/HTML API body or a synthetic status-only wrapper when a safe fallback exists.
- [ ] Every discovered omission is either fixed surgically in an already-owned file or recorded as an explicit follow-up task before release verification.
- [ ] Resources and Resources ISE remain untouched and no arbitrary backend JSON is exposed.

**Verification:**
- [ ] Repository search audit for `request failed with status`, direct/native `fetch` error seams, backend-error raw red blocks, and mutation `.error` states is reviewed against the spec scope.
- [ ] All focused test groups from Tasks 1-12 pass.
- [ ] Run `npm run build` as the final cross-cutting verification; then `git diff --check` and inspect status/diff.

**Dependencies:** Tasks 2-12

**Files likely touched:** None unless the audit identifies an in-scope omission.

**Estimated scope:** Small

## Parallelization Opportunities

- Tasks 3-12 can be parallelized after Task 1 because they consume the same stable resolver and are feature-isolated. Parallel implementations must use separate worktrees/branches and avoid overlapping shared test seams.
- Tasks 8, 9, and 10 are especially safe to parallelize because each policy type owns separate table/modal/test files.
- Task 13 must remain last because it validates the completed global rollout and the explicit Resources/Resources ISE exclusion.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Backend error bodies vary by endpoint | High | Central resolver supports only observed/contracted structured shapes and falls back safely. |
| Plain-text body contains proxy HTML, stack trace, or internal details | High | Reject plain-text/HTML bodies until transport metadata and a user-safe backend contract exist. |
| Synthetic wrapper messages are mistaken for backend detail | High | Resolver traverses to `OrvalApiError.body`; API-without-body uses feature fallback. |
| Cyclic or excessively deep `cause` chain hangs resolution | High | Track visited identities and stop after depth 10. |
| FastAPI 422 uses `detail[]`, not `detail: string` | High | Explicitly parse and join `msg` values in the foundation helper. |
| Arbitrary backend JSON leaks into UI | High | Never stringify unsupported objects; fallback instead. |
| Domain error localization is bypassed | High | Feature domain adapters run before ordinary `Error.message` resolution. |
| Native fetch seam discards backend body | Medium | Audit native fetch separately; migrate or use localized fallback, starting with credential public-key fetch. |
| Resources/Resources ISE change accidentally through a global helper rollout | High | Do not modify their files/adapters; final path-based diff audit. |
| Mutation errors are currently silent in some tables | Medium | Each feature slice inventories the mutation owner's `.error` state and adds shared Alert where required. |
| Existing tests assert backend details are hidden | Medium | Update only tests whose product expectation has intentionally changed; retain tests proving unsupported objects stay hidden. |
| Backend messages are not localized | Medium | Preserve backend text exactly as requested; translation is explicitly out of scope. |
| Cross-cutting change causes regressions | Medium | Small feature slices, checkpoints, then final `npm run build`. |

## Open Questions

None required before implementation. The requested scope is explicit: global backend-backed error display, excluding Resources and Resources ISE, with existing UI structure preserved and backend messages shown when supplied.
