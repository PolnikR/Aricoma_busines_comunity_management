# Todo: Per-Application orchestration_provider_id for Recovery Runs

## Task 1: File backend schema request

**Description:** Request the backend team add `orchestration_provider_id: string | null` to `RecoveryAppRecord`, mirroring the existing field on `RecoveryGroupRecord`.

**Acceptance criteria:**
- [x] Backend ticket/PR filed with the exact schema diff and rationale (parity with `RecoveryGroupRecord`)
- [x] Confirmation obtained on whether existing records will be backfilled or left null

**Verification:**
- [x] Manual check: ticket/PR link recorded

**Dependencies:** None

**Files likely touched:** None (external repo)

**Estimated scope:** XS

---

## Task 2: Add orchestration_provider_id to frontend types

**Description:** Add the new field to `RecoveryApplicationApiRecord` and `RecoveryApplicationListItem`.

**Acceptance criteria:**
- [x] `RecoveryApplicationApiRecord.orchestration_provider_id?: string | null | undefined` added
- [x] `RecoveryApplicationListItem.orchestrationProviderId?: string | null | undefined` added
- [x] Generated API types (`recoveryAppRecord.gen.ts`, `zod.gen.ts`) regenerated and include the field

**Verification:**
- [x] `npm exec tsc --noEmit` on changed files
- [x] Manual check: generated types show the new field

**Dependencies:** Task 1 (backend field must exist and client regenerated)

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/generated/api/models/recoveryAppRecord.gen.ts`
- `src/generated/api/zod.gen.ts`

**Estimated scope:** XS

---

## Task 3: Map orchestration_provider_id in mapRecoveryApplications

**Description:** Thread the field through `mapRecoveryApplications` and `toRecoveryApplicationJson`, following the existing optional-spread pattern used for `airflow_run_id`/`push_to_orchestrator`.

**Acceptance criteria:**
- [x] `mapRecoveryApplications` maps `record.orchestration_provider_id` to `orchestrationProviderId` when present
- [x] `toRecoveryApplicationJson` maps it back to `orchestration_provider_id` when present
- [x] Field absent on record produces no key on the mapped object (matches existing pattern)

**Verification:**
- [x] Tests pass: `npm exec vitest run src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts`

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts` (new/updated cases)

**Estimated scope:** S

---

## Checkpoint: Types and mapping
- [x] `mapRecoveryApplications` tests pass with field present/absent
- [x] No `tsc` errors in changed files

---

## Task 4: Rewrite useOrchestratedApps to resolve provider per record

**Description:** Replace the shared `getEligiblePlatformProviders(...)[0]?.id` lookup with per-record resolution using each application's own `orchestrationProviderId`. Build `OrchestratedEntity[]` directly, matching `useOrchestratedGroups`'s shape and filtering rule (`if (!runId || !providerId) continue`).

**Acceptance criteria:**
- [x] `useOrchestratedApps` no longer imports/uses `usePlatformProviders` or `getEligiblePlatformProviders`
- [x] Hook returns `entities: OrchestratedEntity[]` (entityType `'application'`) instead of `apps` + separate `providerId`
- [x] An application is included only when both `airflowRunId` and `orchestrationProviderId` are present
- [x] `dagId` remains `dag_${airflowRunId}`

**Verification:**
- [x] Tests pass: `npm exec vitest run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.ts`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.ts`

**Estimated scope:** S

---

## Task 5: Simplify useOrchestratedEntities

**Description:** Remove the shared-provider merge branch; concatenate `appsResult.entities` and `groupsResult.entities` directly since both hooks now return the same `OrchestratedEntity[]` shape independently.

**Acceptance criteria:**
- [x] `useOrchestratedEntities` no longer reads a separate `providerId` from `useOrchestratedApps`
- [x] Entities list is a flat concatenation of both hooks' results
- [x] Behavior for Recovery Groups is unchanged

**Verification:**
- [x] Tests pass: `npm exec vitest run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntities.test.ts`

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntities.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntities.test.ts`

**Estimated scope:** XS

---

## Checkpoint: Core behavior
- [x] Applications with both fields appear as orchestrated entities
- [x] Applications missing either field are excluded, no fallback
- [x] Recovery Groups unaffected

---

## Task 6: Update tests for the new resolution path

**Description:** Update existing tests for `useOrchestratedApps`/`useOrchestratedEntities` to stop mocking `usePlatformProviders`/`getEligiblePlatformProviders`, and instead vary per-record `orchestrationProviderId` presence across test cases.

**Acceptance criteria:**
- [x] No remaining references to `usePlatformProviders`/`getEligiblePlatformProviders` mocks in these test files
- [x] Test cases cover: both fields present (included), missing `airflowRunId` (excluded), missing `orchestrationProviderId` (excluded)

**Verification:**
- [x] Tests pass: `npm exec vitest run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.ts src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntities.test.ts`

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntities.test.ts`

**Estimated scope:** S

---

## Checkpoint: Complete
- [x] All focused tests above pass
- [x] No dead imports (`getEligiblePlatformProviders`, `usePlatformProviders`) remain in the apps orchestration path
- [x] Ready for review
