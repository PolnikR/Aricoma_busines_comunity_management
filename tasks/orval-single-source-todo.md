# Todo: Orval as the single source of truth

Plan: `tasks/orval-single-source-plan.md`. Reference implementation: commit `56625bf` (providers).

Standard verification for every migration task:
- Focused tests: `npx vitest run <feature folder>`
- Filtered typecheck: `npx tsc -p tsconfig.app.json --noEmit` shows no errors under the feature path
- Focused lint: `npx eslint <feature folder>`
- `git diff --check`
- One atomic commit per task

## Phase 0: Convention

### Task 1: Record the Orval usage convention as an ADR
**Description:** Write a short ADR in `docs/adr/` stating the target pattern from the plan: generated schemas validate the wire, UI types derive from generated types, form rules stay in forms, spec gaps extend generated schemas and are reported.
**Acceptance criteria:**
- [ ] ADR describes the five rules and links the providers commit as the reference
- [ ] `docs/agents/domain.md` or the ADR index references it, if the repo keeps an index
**Verification:** `git diff --check`
**Dependencies:** None
**Files:** `docs/adr/<next-number>-orval-single-source.md`
**Scope:** XS

## Phase 1: Pure duplicates

### Task 2: Credentials error envelope to shared API
**Description:** `credentialsSchema.ts` only holds `{ detail: string }`, an error envelope that is not in the spec. Move it to `src/shared/api` if other features parse the same envelope, otherwise keep it but outside `api/schemas`. Derive `credentialTypes.ts` from generated credential types.
**Acceptance criteria:**
- [ ] No contract duplicate remains in `credentials/api/schemas`
- [ ] Credential UI types derive from generated types
- [ ] Credential tests pass unchanged or with justified edits
**Dependencies:** Task 1
**Files:** `credentials/api/credentialsApi.ts`, `credentials/api/schemas/credentialsSchema.ts`, `credentials/model/credentialTypes.ts`, tests
**Scope:** S

### Task 3: Policy sets on generated schemas
**Description:** Replace `policySetSubmitSchema` and `policySetWireSchema` with generated `PolicySetsResponse` and the generated submit body. Derive `policySetTypes.ts`. Keep camelCase UI mapping in the API module.
**Acceptance criteria:**
- [ ] `policySetsSchema.ts` deleted
- [ ] Submit payload validated by the generated body schema
- [ ] Required-field rules still enforced by the policy-set form
**Dependencies:** Task 1
**Files:** `policy-sets/api/policySetsApi.ts`, `policy-sets/api/schemas/policySetsSchema.ts`, `policy-sets/model/policySetTypes.ts`, tests
**Scope:** S

### Task 4: Snapshot policies on generated schemas
**Description:** Same pattern for snapshot policies.
**Acceptance criteria:**
- [ ] `snapshotPoliciesSchema.ts` deleted
- [ ] `snapshotPolicyTypes.ts` derived from generated types
- [ ] Form validation unchanged
**Dependencies:** Task 1
**Files:** `recovery-policies/snapshot/api/*`, `recovery-policies/snapshot/model/snapshotPolicyTypes.ts`, tests
**Scope:** S

### Task 5: Clean-room policies on generated schemas
**Description:** Same pattern for clean-room policies.
**Acceptance criteria:**
- [ ] `cleanRoomPoliciesSchema.ts` deleted
- [ ] `cleanRoomPolicyTypes.ts` derived from generated types
**Dependencies:** Task 1
**Files:** `recovery-policies/clean-room/api/*`, `recovery-policies/clean-room/model/cleanRoomPolicyTypes.ts`, tests
**Scope:** S

### Task 6: Recovery-app policies on generated schemas
**Description:** Same pattern for application-recovery policies. This is the largest policy schema (4 objects, 78 lines).
**Acceptance criteria:**
- [ ] `recoveryAppPoliciesSchema.ts` deleted, or reduced to a documented spec-gap extension
- [ ] `recoveryAppPolicyTypes.ts` derived from generated types
**Dependencies:** Task 1
**Files:** `recovery-policies/application-recovery/api/*`, `recovery-policies/application-recovery/model/recoveryAppPolicyTypes.ts`, tests
**Scope:** M

## Checkpoint A: after Tasks 1-6
- [ ] Focused tests for credentials, policy sets and all three policy features pass
- [ ] No typecheck errors under those paths
- [ ] Manual check against the test backend: list, create, edit and delete one policy of each kind
- [ ] Review with human before proceeding

## Phase 2: Partial duplicates and UI model derivation

### Task 7: Discovery cache on generated schemas
**Description:** `discoveryCacheSchema.ts` already imports generated schemas but still declares 3 objects. Replace them with generated `CacheConfigResponse` / `CacheHistoryResponse` and the PUT body. Derive `discoveryCacheTypes.ts` and `discoverySettingsTypes.ts`.
**Acceptance criteria:**
- [ ] No hand-written `z.object` for contract shapes in discovery-settings
- [ ] Draft validation in `discoveryCacheConfigDraft.ts` unchanged
**Dependencies:** Checkpoint A
**Files:** `discovery-settings/api/*`, `discovery-settings/model/*`, tests
**Scope:** M

### Task 8: Platform providers and audit review
**Status:** Reviewed, no code change needed. Platform providers extend the generated `OrchestrationProvider` for the email rule and use a UI discriminated union typed against the generated record; audit only aliases generated schemas.
**Description:** Both schemas already build on generated ones. Confirm no duplicated fields remain in `platformProviderTypes.ts` and `accessLogTypes.ts`; derive what is still hand-written. Access-log schemas stay as they are in the spec.
**Acceptance criteria:**
- [ ] Remaining hand-written types are only UI concerns, each with a one-line reason
**Dependencies:** Checkpoint A
**Files:** `platform-providers/model/platformProviderTypes.ts`, `audit/model/accessLogTypes.ts`, related API modules
**Scope:** S

### Task 9: Derive `ProviderRecord` from the generated type
**Description:** Replace the hand-written `ProviderRecord` interface with `Omit<ProviderRecordOutput, ...> & { type, credentialStatus, description, ipAddress, credentialId, rawRecord }`. Remove the dead `port` field if no consumer needs it.
**Acceptance criteria:**
- [ ] `ProviderRecord` has no field that repeats the generated type unchanged
- [ ] All provider consumers compile without changes, or with minimal justified edits
**Dependencies:** Checkpoint A
**Files:** `providers/model/providerTypes.ts`, `providers/api/providersApi.ts`, consumers that read `port`
**Scope:** M

## Checkpoint B: after Tasks 7-9
- [ ] Focused tests for providers-connectors and platform-administration pass
- [ ] No typecheck errors under those paths
- [ ] Manual check: provider list, detail and edit; discovery settings save
- [ ] Review with human

## Phase 3: Discovery inventory

### Task 10: Volume tree on generated schema
**Description:** `VolumeTreeResponse` is fully typed in the spec. Replace `flashSystemVolumeTreeSchema.ts` (12 objects) with it and derive `flashSystemVolumeTreeTypes.ts`.
**Acceptance criteria:**
- [ ] `flashSystemVolumeTreeSchema.ts` deleted
- [ ] Topology view renders the same tree for a recorded response
**Dependencies:** Checkpoint B
**Files:** `infrastructure/api/flashSystemVolumeTreeApi.ts`, `infrastructure/api/schemas/flashSystemVolumeTreeSchema.ts`, `infrastructure/model/flashSystemVolumeTreeTypes.ts`, tests
**Scope:** M

### Task 11: Power inventory, generated base plus spec-gap extension
**Description:** Parse with `PowerVmsResponse`. `lpar` and `vios` are `record<string, unknown>` in the spec, so extend `PowerVmRecord` only for those two fields with a `// SPEC GAP:` comment.
**Acceptance criteria:**
- [ ] Local schema contains only the `lpar`/`vios` narrowing, built on the generated record
- [ ] `mapPowerInventory` tests pass
**Dependencies:** Checkpoint B
**Files:** `resources/api/powerInventoryApi.ts`, `resources/api/schemas/powerInventorySchema.ts`, `resources/helpers/mapPowerInventory.ts`, tests
**Scope:** S

### Task 12: FlashSystem inventory, generated base plus spec-gap extension
**Description:** Parse with `VolumesResponse`. `volumes`, `pools`, `hosts` and `clusters` are untyped records, so keep a narrow extension for them.
**Acceptance criteria:**
- [ ] Top-level fields come from the generated schema
- [ ] Extension covers only the untyped collections and carries a `// SPEC GAP:` comment
- [ ] FlashSystem inventory view and metrics tests pass
**Dependencies:** Checkpoint B
**Files:** `resources/api/flashSystemInventoryApi.ts`, `resources/api/schemas/flashSystemInventorySchema.ts`, `resources/helpers/mapFlashSystemInventory.ts`, tests
**Scope:** M

### Task 13: VM storage volumes, generated base plus spec-gap extension
**Description:** Parse with `VdisksByVmResponse`; `vdisks` is untyped, so extend only that field.
**Acceptance criteria:**
- [ ] Extension covers only `vdisks`
- [ ] VM detail disks and snapshots tab behaves the same
**Dependencies:** Checkpoint B
**Files:** `resources/api/vmStorageVolumesApi.ts`, `resources/api/schemas/vmStorageVolumesSchema.ts`, `resources/helpers/mapVmStorageVolumes.ts`, tests
**Scope:** S

## Checkpoint C: after Tasks 10-13
- [ ] Focused tests for discovery-inventory pass
- [ ] No typecheck errors under discovery-inventory, apart from the known FlashCopy resolution error handled in Task 17
- [ ] Manual check against the test backend: VMware, IBM Power and FlashSystem resources, topology view
- [ ] Review with human

## Phase 4: Guard and backend follow-up

### Task 14: ESLint guard against hand-written contract schemas
**Description:** Add an ESLint rule that forbids `z.object` and `z.looseObject` in `src/features/**/api/schemas/**` and forbids importing `zod` in `src/features/**/model/**`. Spec-gap files are allowed through an explicit allowlist that points to the Task 15 report.
**Acceptance criteria:**
- [ ] A new hand-written contract schema fails lint
- [ ] Current code passes lint
**Dependencies:** Checkpoint C
**Files:** `eslint.config.*`
**Scope:** XS

### Task 15: Spec-gap report for backend
**Description:** List every field the spec types as `record<string, unknown>` or `unknown` that the FE needs typed: `PowerVmRecord.lpar/vios`, `VolumesResponse` collections, `VdisksByVmResponse.vdisks`, `RollbackReport` body. Include the shape the FE currently assumes.
**Acceptance criteria:**
- [ ] Report lists each gap with endpoint, field and expected shape
- [ ] Delivered where you decide: GitHub issue or a doc for the backend team
**Dependencies:** Tasks 11-13
**Files:** `docs/` or a GitHub issue
**Scope:** XS

## Phase 5: Recovery plans on the current spec

### Task 16: Regenerate client from the current spec
**Status:** Done in commit `2df865b` (access-log schemas kept).

### Task 17: Replace default FlashCopy provider resolution
**Description:** `defaultFlashcopyProviderId` no longer exists. VM detail is done: it no longer sends `ibm_provider_id`, so the backend default `ibm-flashsystem-01` applies, with a code comment explaining why. The recovery group builder uses the group's `provider_id_volume`.
**Acceptance criteria:**
- [x] VM detail does not send `ibm_provider_id` and documents the backend default
- [ ] Recovery group builder resolves related volumes from the group's `provider_id_volume`
- [ ] No reference to `defaultFlashcopyProviderId` remains in `src/features`
- [ ] VM detail and related-volumes tests pass
**Dependencies:** Task 16
**Files:** `useRecoveryGroupRelatedVolumes.ts`, `RecoveryGroupBuilder.tsx`, their tests
**Scope:** S

### Task 18: Recovery groups on generated schemas
**Description:** Migrate recovery groups to the new generated `RecoveryGroupRecord`, including `orchestration`. `topology`, `metro_mirror` and `peer_name` are not in the current spec and come with the next regen. Fold `recoveryGroupsValidation.ts` into the form or into an extension of the generated schema. Keep the rollback report as a documented spec-gap extension.
**Acceptance criteria:**
- [ ] `recoveryGroupsSchema.ts` reduced to the rollback spec-gap extension or deleted
- [ ] `recoveryGroupTypes.ts` derived from generated types
- [ ] Recovery group list, builder, delete and rollback tests pass
**Dependencies:** Tasks 16-17
**Files:** `recovery-groups/api/*`, `recovery-groups/helpers/mapRecoveryGroups.ts`, `recovery-groups/model/recoveryGroupTypes.ts`, `recovery-groups/utils/rollbackReport.ts`, tests
**Scope:** L, split into submit/read and rollback if it exceeds 5 files of real change

### Task 19: Recovery applications on generated schemas
**Description:** Same pattern for recovery applications, including inventory changes (`recovered_datastores`, `compute_provider_id`, removed `provider_id_vm` and `vm.error`) and the delete `provider_id_volume` parameter.
**Acceptance criteria:**
- [ ] `recoveryApplicationsSchema.ts` reduced to the rollback spec-gap extension or deleted
- [ ] `recoveryApplicationTypes.ts` derived from generated types
- [ ] Inventory, table, delete and rollback tests pass
**Dependencies:** Task 18
**Files:** `recovery-applications/api/*`, `recovery-applications/components/RecoveryApplicationInventory.tsx`, `recovery-applications/helpers/mapRecoveryApplications.ts`, `recovery-applications/model/recoveryApplicationTypes.ts`, tests
**Scope:** L, split into inventory and record/delete if needed

## Checkpoint D: complete
- [ ] Full `npx tsc -p tsconfig.app.json --noEmit` is green
- [ ] Focused tests for every migrated feature pass
- [ ] Lint guard active
- [ ] Manual end-to-end against the test backend: create recovery group, create recovery application, delete with rollback
- [ ] Review with human
