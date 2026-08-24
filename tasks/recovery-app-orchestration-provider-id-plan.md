# Implementation Plan: Per-Application orchestration_provider_id for Recovery Runs

## Overview

Recovery Runs resolves an orchestrator provider for each orchestrated entity so it can query Airflow. Recovery Groups already carry their own `orchestration_provider_id` per record and are filtered per-record (`useOrchestratedGroups`). Recovery Applications currently have no such field on their record — instead `useOrchestratedApps` computes one shared provider (`getEligiblePlatformProviders(...)[0]?.id`) and applies it to every application, and `useOrchestratedEntities` drops ALL applications if that shared lookup returns null.

This plan adds `orchestration_provider_id` to the `RecoveryAppRecord` schema (backend, separate repo) and updates the frontend to resolve providers per-application, matching the groups pattern exactly: an application is included only if it has both `airflow_run_id` and its own `orchestration_provider_id`.

## Architecture Decisions

- Add `orchestration_provider_id: string | null` to `RecoveryAppRecord`, mirroring the existing field on `RecoveryGroupRecord`. This is a backend schema change in a separate repo and is a hard dependency (Phase 1) for the frontend work (Phase 2).
- `useOrchestratedApps` builds `OrchestratedEntity` objects directly (not a raw `OrchestratedApp` + separate `providerId`), the same shape `useOrchestratedGroups` returns. This removes the need for `useOrchestratedEntities` to special-case a shared provider.
- The `usePlatformProviders`/`getEligiblePlatformProviders` shared-provider lookup is removed from the apps orchestration path entirely — no fallback. An application without its own `orchestration_provider_id` is excluded, identical to how a group without one is excluded today.
- `RecoveryAppBuilder.tsx`'s submit-time provider dropdown (`formState.orchestrationProviderId`) is unrelated user input and is out of scope.

## Task List

### Phase 1: Backend schema (external repo — tracked here as a dependency gate)

- [ ] Task 1: File the backend request to add `orchestration_provider_id: string | null` to `RecoveryAppRecord`, mirroring `RecoveryGroupRecord`. This repo cannot implement this task; it only tracks the dependency.

### Checkpoint: Backend field available
- [ ] `orchestration_provider_id` present in `RecoveryAppRecord` in the backend's OpenAPI schema
- [ ] Frontend API client regenerated (`npm run <orval script>`) and `orchestration_provider_id` visible in generated types (`src/generated/api/zod.gen.ts`, `recoveryAppRecord.gen.ts`)

### Phase 2: Frontend types and mapping

- [ ] Task 2: Add `orchestration_provider_id` to `RecoveryApplicationApiRecord` and `orchestrationProviderId` to `RecoveryApplicationListItem`
- [ ] Task 3: Thread the field through `mapRecoveryApplications` and `toRecoveryApplicationJson`, following the existing optional-spread pattern used for `airflow_run_id`/`push_to_orchestrator`

### Checkpoint: Types and mapping
- [ ] Focused tests for `mapRecoveryApplications` pass with the new field present/absent

### Phase 3: Orchestration resolution

- [ ] Task 4: Rewrite `useOrchestratedApps` to build `OrchestratedEntity[]` directly per record, filtering on `airflowRunId` and `orchestrationProviderId` both present — remove `usePlatformProviders`/`getEligiblePlatformProviders` usage from this hook
- [ ] Task 5: Simplify `useOrchestratedEntities` to a flat concatenation of `appsResult.entities` and `groupsResult.entities`, removing the shared-provider merge branch

### Checkpoint: Core behavior
- [ ] Applications with their own `orchestration_provider_id` and `airflow_run_id` appear as orchestrated entities
- [ ] Applications missing either field are excluded, with no shared-provider fallback
- [ ] Recovery Groups behavior is unchanged

### Phase 4: Tests

- [ ] Task 6: Update `useOrchestratedApps`/`useOrchestratedEntities` tests to drop `usePlatformProviders` mocking for this path and instead vary per-record `orchestrationProviderId`

### Checkpoint: Complete
- [ ] All focused tests pass
- [ ] `getEligiblePlatformProviders` import removed from the apps orchestration path (confirm no dead import remains)
- [ ] Ready for review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend field ships later than frontend work starts | Blocks Phase 2+ | Phase 1 checkpoint gates all frontend phases; do not start Phase 2 until the field is confirmed in the regenerated client |
| Existing application records lack `orchestration_provider_id` (no backfill) | Those apps silently disappear from Recovery Runs | Confirmed acceptable per design decision (exclude, no fallback) — flag to backend team whether a backfill/migration is needed for existing data |

## Open Questions

- Does the backend need to backfill `orchestration_provider_id` for existing `RecoveryAppRecord` rows, or is a null value acceptable for pre-existing applications until they're resaved?
