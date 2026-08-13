# Implementation Plan: Code Review Follow-up Fixes

## Overview

Implement the approved follow-up fixes from the `src/features` code review:
preserve provider URLs through create/edit, fix Recovery Group and Recovery
Application edit round-trips, keep Recovery Groups visible when their source
provider cannot be resolved, resolve render-phase state updates, correctly map
the submitted Recovery Group response, stop masking VMware HTTP 400 responses,
and make View JSON show the GET/read representation rather than a submit payload.

## Confirmed Scope

- Implement review points 2 through 9.
- Point 2: add URL to both infrastructure-provider and platform-provider
  create/edit flows.
- Infrastructure-provider `port` remains UI-only and must still be omitted from
  POST until the backend submit contract supports it.
- Point 4: preserve backend environment values; keep the current hard-coded
  `sourceConnection` and `targetConnection` defaults unchanged.
- Point 5: do not filter Recovery Groups out when their configured source
  provider is missing or unknown; preserve and display the backend record with
  an explicit unresolved-provider state.
- Points 1, 10, and 11 remain unchanged because they are accepted development
  constraints.

## Architecture Decisions

- Keep read models and write models separate. Edit forms must preserve every
  supported write field, while View JSON must use a dedicated read/GET
  representation and must not reuse a lossy submit serializer.
- Do not extend the infrastructure-provider submit contract with `port` before
  backend support exists. Retain the existing explicit regression test proving
  that it is omitted.
- Recovery Group automatic hydration must happen outside the render phase.
  System-derived hydration must not mark the form dirty; user actions must.
- Recovery Group read/list models must represent an unresolved provider
  explicitly. For an unresolved VM provider, the UI must not guess whether the
  workload is VMware or IBM Power. Editing remains limited to fully resolved
  groups, while read-only JSON and safe record-level actions remain available.
- Unknown Recovery Application environments are valid backend data. The edit
  form will expose the current unknown value as a preserved option instead of
  coercing it to `dev`.
- Treat every non-successful VMware inventory response, including HTTP 400, as
  an error until the backend exposes a stable machine-readable “no inventory”
  error contract.
- Reuse the existing `JsonViewerModal`; only the data mappers/call sites change.
- Add regression tests before or together with each behavior change.

## Dependency Graph

```text
Provider read/write contracts
  -> provider form state and URL controls
  -> provider View JSON

Recovery Group GET mapping
  -> unresolved-provider read state
  -> safe table rendering and action gating
  -> builder initial state
  -> render-safe automatic hydration
  -> edit submission

Recovery Application GET model
  -> environment form state
  -> edit round-trip

Backend response/error contracts
  -> Recovery Group submit result mapping
  -> VMware inventory error state
```

## Task 1: Add URL to the infrastructure-provider create/edit flow

**Description:** Carry the already-supported optional provider `url` field
through form state, dirty-state comparison, validation, create, and edit. Keep
the current port field visible but do not add it to `ProviderSubmitData`.

**Acceptance criteria:**

- [ ] Create can submit a valid URL and an empty URL is normalized to `null`.
- [ ] Edit pre-fills and preserves the GET URL when another field is changed.
- [ ] Infrastructure-provider POST still contains no `port` property.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx -- --project ui`
- [ ] Manual check: create and edit modals show the URL field and preserve it.

**Dependencies:** None

**Files likely touched:**

- `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`
- `src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 2: Add URL to the platform-provider create/edit flow

**Description:** Carry the optional Airflow/platform-provider URL through form
state, dirty checking, create, and edit using the existing submit schema.

**Acceptance criteria:**

- [ ] Create submits a populated valid URL.
- [ ] Edit pre-fills and preserves the URL returned by GET.
- [ ] An empty optional URL is omitted from the platform-provider POST payload.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx -- --project ui`
- [ ] Manual check: Airflow create/edit modal displays and preserves URL.

**Dependencies:** None

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`

**Estimated scope:** Medium (4 files)

## Checkpoint: Provider write flows

- [ ] Tasks 1-2 focused tests pass.
- [ ] Provider API schema tests still pass.
- [ ] No infrastructure-provider `port` is sent to the backend.

## Task 3: Preserve Recovery Group orchestration and remove render-phase updates

**Description:** Initialize the builder from the existing
`orchestrationProviderId` and replace render-phase `setState` calls with an
explicit, render-safe synchronization path for related-volume discovery and
single-provider defaults.

**Acceptance criteria:**

- [ ] Editing an orchestrated group preserves its existing provider when two or
  more eligible platform providers exist.
- [ ] No state setter or parent callback runs during render.
- [ ] Automatic provider/discovery hydration does not report a user-created
  dirty state, while manual changes still do.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx -- --project ui`
- [ ] Manual check: edit a pushed Recovery Group, navigate all steps, and save
  without reselecting its orchestration provider.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Estimated scope:** Medium (2 complex files)

## Task 4: Preserve unknown Recovery Application environments

**Description:** Remove the `unknown -> dev` coercion from the GET-to-form
mapper. Let the edit form retain and display an environment such as
`production` or `uat`, while keeping `dev` as the default for new applications.

**Acceptance criteria:**

- [ ] Opening and saving an application with `environment: "production"`
  submits `production`, not `dev`.
- [ ] The select displays the current backend value even when it is outside the
  standard `dev/staging/prod` choices.
- [ ] The current hard-coded source/target connection defaults remain unchanged.

**Verification:**

- [ ] Focused unit test: `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts -- --project unit`
- [ ] Focused UI test: `npm exec vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx -- --project ui`
- [ ] Manual check: edit a fixture with `production` and confirm its JSON remains
  unchanged after save.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`

**Estimated scope:** Medium (5 files)

## Task 5: Preserve unresolved Recovery Groups in the read model

**Description:** Remove the API-level provider filter that silently drops
Recovery Groups. Extend the read model and mapper with an explicit provider
resolution state, preserving the configured provider ID and resource kind. An
unresolved VM record must remain type-unknown instead of being classified as
VMware or IBM Power without evidence.

**Acceptance criteria:**

- [ ] A Recovery Group with a missing VM provider remains in the fetched list.
- [ ] A Recovery Group with a missing volume provider remains in the fetched
  list.
- [ ] The mapped record retains its backend provider ID, resources,
  orchestration fields, and raw JSON representation.
- [ ] Missing VM providers are represented as unresolved and are not assigned a
  fabricated VMware or IBM Power workload type.
- [ ] Existing records with resolvable providers keep their current mapping.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts -- --project unit`

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Estimated scope:** Medium (5 files)

## Task 6: Render unresolved Recovery Groups safely

**Description:** Show unresolved groups in the existing table and detail drawer
with a clear provider-unavailable state. Disable Edit because the builder cannot
safely reconstruct an unknown VM workload/provider, but keep View JSON and
other actions whose own prerequisites are satisfied.

**Acceptance criteria:**

- [ ] The table and drawer show the unresolved group and its configured provider
  ID with a translated “Provider unavailable” state.
- [ ] Rendering does not call the concrete workload label helper for an unknown
  VM type and cannot crash.
- [ ] Edit is disabled with an accessible explanation for unresolved records.
- [ ] View JSON remains available and displays the complete GET record.
- [ ] Delete and orchestration rollback retain their existing confirmation and
  provider-precondition rules; they are not disabled merely because the source
  provider is unresolved.
- [ ] Resolved Recovery Groups preserve their current table, drawer, and action
  behavior.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx -- --project ui`
- [ ] Manual check: load a fixture that references a removed provider and verify
  it stays visible, View JSON works, and Edit cannot be opened.

**Dependencies:** Task 5

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium (5 files)

## Task 7: Map the submitted Recovery Group response by ID

**Description:** When POST returns a collection, select the response record with
the submitted normalized Recovery Group ID instead of reading array index zero.

**Acceptance criteria:**

- [ ] `airflowRunId` comes from the response record matching the submitted ID.
- [ ] A reordered multi-record response cannot attach another group’s run ID.
- [ ] Missing matching records produce the currently supported `null` run ID
  without crashing.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts -- --project unit`

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Estimated scope:** Small (2 files)

## Checkpoint: Recovery read, edit, and submit integrity

- [ ] Tasks 3-7 focused tests pass.
- [ ] Recovery Groups remain visible when their source provider is unavailable,
  without inventing the missing VM provider type.
- [ ] Recovery Group and Recovery Application edit round-trips preserve backend
  values not explicitly changed by the user.
- [ ] React console has no render-phase update warning in the affected builder.

## Task 8: Stop converting VMware HTTP 400 to empty inventory

**Description:** Remove the blanket HTTP 400 fallback and propagate a normal
inventory request error for provider- and tag-filtered requests.

**Acceptance criteria:**

- [ ] Filtered HTTP 400 responses reject with the same stable inventory error
  style as other non-2xx responses.
- [ ] Genuine successful empty responses still map to an empty inventory.
- [ ] UI consumers continue to expose retry/error states through React Query.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts -- --project unit`
- [ ] Manual check: mock HTTP 400 and verify an error alert appears instead of a
  zero-results state.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/api/vmwareInventoryApi.ts`
- `src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`

**Estimated scope:** Small (2 files)

## Task 9: Make provider View JSON use the GET representation

**Description:** Stop passing provider records through submit schemas before
display. Show the validated GET/read record so `port`, `url`, and
`credentialStatus` are not removed.

**Acceptance criteria:**

- [ ] Infrastructure-provider JSON includes all present GET fields, including
  `port`, `url`, and `credentialStatus`.
- [ ] Platform-provider JSON includes all present GET fields, including `url`
  and `credentialStatus`.
- [ ] View JSON remains read-only and the existing shared modal is reused.

**Verification:**

- [ ] Focused tests: `npm exec vitest run src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx -- --project ui`

**Dependencies:** Tasks 1-2

**Files likely touched:**

- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 10: Make Recovery App Policy View JSON use the GET representation

**Description:** Add a dedicated read serializer for Recovery App Policies and
use it in View JSON. Unlike the submit serializer, it must retain all GET fields,
including mode-inapplicable fields represented as `null`.

**Acceptance criteria:**

- [ ] JSON for `latest` includes the GET fields
  `snapshot_max_age_value`, `snapshot_max_age_unit`, and
  `snapshot_target_time` with their `null` values.
- [ ] JSON field names and values match the validated backend GET schema.
- [ ] Submit serialization and its mode-specific field omission remain
  unchanged.

**Verification:**

- [ ] Focused unit/API tests: `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/api/recoveryAppPoliciesApi.test.ts -- --project unit`
- [ ] Focused UI tests: `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx -- --project ui`

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-policies/application-recovery/api/recoveryAppPoliciesApi.ts`
- `src/features/recovery-plans/recovery-policies/application-recovery/api/recoveryAppPoliciesApi.test.ts`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 11: Audit remaining View JSON call sites

**Description:** Verify that Recovery Applications, Recovery Groups, Snapshot
Policies, Clean Room Policies, and Policy Sets already produce their complete
GET/read shapes. Change only a call site proven to be lossy.

**Acceptance criteria:**

- [ ] Every View JSON table has a regression assertion for fields that exist
  only in, or are optional/null in, the GET response.
- [ ] No submit-only normalization changes a displayed GET payload.
- [ ] No duplicate JSON modal or generic table component is introduced.

**Verification:**

- [ ] Run the focused table suites for all View JSON consumers.
- [ ] Manually compare one JSON modal per resource type with its API fixture.

**Dependencies:** Tasks 9-10

**Files likely touched:** Only existing affected table tests; production files
only if the audit proves a lossy mapping.

**Estimated scope:** Small to Medium (test-focused)

## Checkpoint: API errors and read JSON

- [ ] Tasks 8-11 focused suites pass.
- [ ] HTTP 400 is visible as an error.
- [ ] Provider and policy JSON match GET fixtures exactly.

## Task 12: Final regression and production verification

**Description:** Run the complete quality gate once all scoped behavior is
implemented and inspect the final diff for unintended contract changes.

**Acceptance criteria:**

- [ ] No changes are made to X-User handling, UI-only Recovery Actions,
  Discovery Settings, backend pagination, or the hard-coded recovery connection
  defaults.
- [ ] Unresolved Recovery Groups are visible and safely action-gated.
- [ ] All scoped regression tests pass.
- [ ] The final diff contains no unrelated files.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm exec vite build`
- [ ] `git diff --check`
- [ ] Manual browser smoke test for both provider editors, Recovery Group edit,
  Recovery Application edit, VMware 400, and View JSON.

**Dependencies:** Tasks 1-11

**Files likely touched:** None; verification only

**Estimated scope:** Small

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Infrastructure backend rejects or ignores URL | Medium | Keep the existing validated URL contract and cover the exact POST body with an API/component test. |
| Infrastructure port looks persisted although BE does not support it | Medium | Preserve the explicit “port omitted” regression test; do not expand the submit schema. |
| Platform URL clearing semantics are undefined | Medium | Empty optional URL is omitted; do not invent `null` until the backend contract allows it. |
| Automatic discovery hydration causes loops or false dirty state | High | Use an idempotent transition keyed by discovery result and test render count/dirty callbacks. |
| Unknown environment cannot be represented by the select | High | Inject the current unknown value as an edit-only option and preserve it verbatim. |
| Missing VM provider does not reveal VMware versus IBM Power | High | Preserve an explicit unresolved VM state; never infer a concrete workload type without a matching provider. |
| Unresolved Recovery Group enters an editor that requires inventory metadata | High | Disable Edit for unresolved groups, explain why in the UI, and retain read-only JSON plus independently safe actions. |
| Backend uses HTTP 400 for a legitimate no-results condition | Medium | Surface it as an error now; add a narrow exception only after a stable backend error code is documented. |
| View JSON accidentally changes POST serialization | Medium | Use separate read and submit serializers and test both independently. |
| Full UI test suite is slow | Low | Run focused suites at checkpoints and the full suite once at completion. |

## Open Questions

None blocking. Infrastructure-provider port remains intentionally frontend-only
until the backend submit contract changes.
