# Implementation Plan: Orval as the single source of truth for the API contract

## Overview

Every backend change currently has to be fixed in two places: the generated Orval
client (`src/generated/api`) and hand-written zod schemas / model interfaces in
`src/features/*`. This plan migrates every feature to the pattern already applied to
providers (commit `56625bf`): generated zod schemas validate requests and responses,
UI model types are derived from generated types, and only genuine UI concerns are
hand-written. After the migration a backend change means regenerate, typecheck, and
fix only the places that actually use the changed field.

Everything, including recovery groups and recovery applications, is migrated now
against the current spec (regen commit `2df865b`). When the backend ships a new spec,
it goes through the normal flow: regenerate, typecheck, fix the reported places.

## Target pattern (per feature)

1. **Wire validation uses generated schemas.** Responses are parsed with the
   generated `*Response` schema via `parseGeneratedResponse`. Submit payloads are
   parsed with the generated `*Body` schema. No hand-written `z.object` duplicates
   the contract.
2. **UI model types are derived.** `Omit<GeneratedOutput, K> & { overrides }`, where
   overrides are only narrowed enums, non-null defaults, and UI-only fields. Submit
   types are the generated input type directly (as `ProviderSubmitData = Provider`).
3. **Form rules stay in the form.** "Required", "valid email", "positive integer"
   belong to the form's `validate`, or to `Generated.extend({...})` when a form uses
   a schema. They never live in a copy of the whole object.
4. **Spec gaps are explicit.** Where the spec types a field only as
   `record<string, unknown>`, the feature keeps a narrow local schema that
   **extends the generated one** and covers only the untyped field. The file carries
   a `// SPEC GAP:` comment and the gap is reported to backend.
5. **One feature, one commit.** Focused tests and a filtered typecheck per commit.

## Architecture Decisions

- **Per-feature migration, not big-bang.** Each commit is reviewable and revertible
  on its own. The providers commit is the reference implementation.
- **No custom Orval transformer or mutator codegen.** Deriving UI types with
  TypeScript utility types covers the need without new tooling.
- **Spec gaps are handled on the frontend by extension, fixed at the source by
  backend.** The FE never re-declares fields the spec already types.
- **Lint guard at the end.** An ESLint rule stops new hand-written contract schemas
  from appearing once the migration is done.

## Inventory

| Feature | Custom schema | Generated counterpart | Category |
|---|---|---|---|
| credentials | `credentialsSchema` (error `detail`) | not in spec | error envelope, move to shared |
| policy-sets | `policySetsSchema` | `PolicySetsResponse`, submit body | duplicate |
| snapshot policies | `snapshotPoliciesSchema` | `SnapshotPoliciesResponse` | duplicate |
| clean-room policies | `cleanRoomPoliciesSchema` | `CleanRoomPoliciesResponse` | duplicate |
| recovery-app policies | `recoveryAppPoliciesSchema` | `RecoveryAppPoliciesResponse` | duplicate |
| discovery cache | `discoveryCacheSchema` (partly generated) | `CacheConfigResponse`, `CacheHistoryResponse` | partial duplicate |
| platform providers | `platformProvidersSchema` | already generated-based | review only |
| audit | `accessLogSchema` | already generated-based | review only |
| providers | none (done), `ProviderRecord` interface | `ProviderRecordOutput` | derive UI type |
| volume tree | `flashSystemVolumeTreeSchema` | `VolumeTreeResponse` (typed) | duplicate |
| flashsystem inventory | `flashSystemInventorySchema` | `VolumesResponse` (records untyped) | spec gap |
| vm storage volumes | `vmStorageVolumesSchema` | `VdisksByVmResponse` (`vdisks` untyped) | spec gap |
| power inventory | `powerInventorySchema` | `PowerVmsResponse` (`lpar`/`vios` untyped) | spec gap |
| recovery groups | `recoveryGroupsSchema`, `recoveryGroupsValidation` | `RecoveryGroupsResponse`, `RollbackReport` (only `status` typed) | spec gap on rollback |
| recovery applications | `recoveryApplicationsSchema` | `RecoveryAppsResponse`, `RollbackReport` | spec gap on rollback |

## Task List

Tasks with acceptance criteria are in `tasks/orval-single-source-todo.md`.

### Phase 0: Convention
- [x] Task 1: Record the Orval usage convention as an ADR

### Phase 1: Pure duplicates
- [x] Task 2: Credentials error envelope to shared API
- [x] Task 3: Policy sets on generated schemas
- [x] Task 4: Snapshot policies on generated schemas
- [x] Task 5: Clean-room policies on generated schemas
- [x] Task 6: Recovery-app policies on generated schemas

### Checkpoint A: after Tasks 1-6

### Phase 2: Partial duplicates and UI model derivation
- [x] Task 7: Discovery cache on generated schemas
- [x] Task 8: Platform providers and audit review
- [x] Task 9: Derive `ProviderRecord` from the generated type

### Checkpoint B: after Tasks 7-9

### Phase 3: Discovery inventory (duplicates and spec gaps)
- [x] Task 10: Volume tree on generated schema
- [x] Task 11: Power inventory, generated base plus spec-gap extension
- [x] Task 12: FlashSystem inventory, generated base plus spec-gap extension
- [x] Task 13: VM storage volumes, generated base plus spec-gap extension

### Checkpoint C: after Tasks 10-13

### Phase 4: Guard and backend follow-up
- [ ] Task 14: ESLint guard against hand-written contract schemas
- [ ] Task 15: Spec-gap report for backend

### Phase 5: Recovery plans on the current spec
- [x] Task 16: Regenerate client from the current spec (commit `2df865b`)
- [x] Task 17: Replace default FlashCopy provider resolution
- [ ] Task 18: Recovery groups on generated schemas
- [ ] Task 19: Recovery applications on generated schemas

### Checkpoint D: complete

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Generated schemas are stricter or looser than the custom ones, so a real backend response that passed before now fails, or bad data now passes | High | Keep existing response-contract tests; compare with a real response from the test backend before each commit |
| Spec gaps make the FE lose typing on untyped records | Medium | Extend the generated schema only for the untyped field and report the gap (Task 15) |
| Removing schema tests hides a lost validation rule | Medium | Before deleting a schema test, check that the rule is either in the form or intentionally dropped, and say so in the commit |
| Key order and default values change in submitted JSON | Low | Assert on parsed objects, not raw JSON strings |
| Repo typecheck is red until Phase 5 is done (recovery groups/apps, FlashCopy resolution) | Medium | Filter typecheck output by the migrated feature path; Phase 5 restores a fully green typecheck |
| New spec changes recovery groups again (topology, metro_mirror, peer_name are announced) | Medium | Accepted: migrate now on the current spec, handle the new spec as a normal regen afterwards |

## Open Questions

- **FlashCopy provider resolution (Task 17).** Decided for VM detail: send no
  `ibm_provider_id` and rely on the backend default `ibm-flashsystem-01`, because
  nothing identifies which FlashSystem holds a VM's disks. Recovery group builder:
  use the group's `provider_id_volume`. Backend follow-up: resolve the FlashSystem
  from the disks' `naa` so the FE does not depend on a default.
- **Tracker.** `CLAUDE.md` names GitHub Issues as the tracker. This plan follows the
  repo's existing `tasks/*-plan.md` / `*-todo.md` convention. Should the tasks also
  be created as GitHub issues?
- **Spec gaps.** Who on backend receives the spec-gap report from Task 15?
