# Implementation Plan: Metro Mirror mode="managed"

## Overview

Allow Recovery Groups with `topology="metro_mirror"` to choose `existing` or `managed`.
Existing keeps today's behaviour (CG id + auxiliary names, relationship lookup/prefill).
Managed sends only `metro_mirror: { mode: "managed" }` and volumes with `name`; the backend
provisions auxiliary volumes, relationships and the consistency group and may persist
`consistency_group_id` / `auxiliary_name`, which FE reads back but never submits.
No backend, generated Orval or `target_pool` changes.

## Current flow (analysis)

- `RecoveryGroupTopologyStep.tsx` – mode select hardcodes `metroMirrorMode: 'existing'`,
  Managed option is `disabled`; topology/source/mode selects are `disabled={managed}`.
- `recoveryGroupTopology.ts` – `getRecoveryGroupTopologyError` returns `'managed'` for managed
  and `'modeRequired'` for anything but existing.
- `recoveryGroupsValidation.ts` – throws for managed; `metroMirrorMode: 'existing' | null`;
  requires CG id + every auxiliary for any metro_mirror.
- `mapRecoveryGroups.ts` – `toRecoveryGroupSubmitPayload` hardcodes `mode: 'existing'`;
  `toVolumesPayload` always emits `auxiliary_name` (fallback `''`) for metro_mirror.
  `mapRecoveryGroupApiRecord` already reads mode / CG / auxiliary names (keep as is).
- `RecoveryGroupBuilder.tsx` – `metroExisting` gates lookup + `RecoveryGroupMetroMirrorFields`;
  `storageValid`, `renderVolumeContent`, `showAuxiliaryHint` key on `topology === 'metro_mirror'`
  only; `topologyValid` is false for any persisted managed group.
- `useRecoveryGroups.ts` – create and update both go through `validate → topology check →
  toRecoveryGroupSubmitPayload`; no change needed beyond what validation/topology provide.

## Architecture Decisions

- **Validation is mode-split.** Shared metro checks (source provider, ≥1 source volume) stay;
  CG id + auxiliary names are required only for `existing`. For `managed` the validated draft
  carries `consistencyGroupId: null` and `auxiliaryNamesByVolume: {}`, so persisted
  backend-generated values can never leak into a submit.
- **One volume rule in the mapper.** `existing` → `auxiliary_name` always (fallback `''`, as today);
  `managed` → `auxiliary_name` only if a value exists. Submit gets `{}` from validation, so it
  emits bare `{ name }`; the JSON view of a read-back managed group still shows the backend values.
- **Mode switching only for new groups** (user decision). In edit, the mode select is locked;
  topology/source stay locked for a persisted managed group (as today).
- **Managed lifecycle lock** (user decision). A persisted managed group is editable only when it
  is clean: `pushToOrchestrator !== true` and no backend-generated CG id / auxiliary name.
  Pushed → read-only until rollback. Partial rollback (pushed=false but derived ids left) →
  still read-only. Implemented by replacing the current `initialData?.metroMirrorMode !== 'managed'`
  condition in the Builder with this lock and showing a warning in the topology step.
- **Lookup stays Existing-only.** `useRecoveryGroupMetroMirrorRelationships` is already enabled
  only for `metroExisting`; Managed renders no `RecoveryGroupMetroMirrorFields` and no auxiliary inputs.
- **Locales:** drop "(unavailable)" from the Managed label; remove the now-unused
  `topology.errors.managed`; add `topology.managedHint` and `topology.managedLocked` (en/cs/sk).

## Task List

### Phase 1: Domain
- [ ] Task 1: Mode-split validation and topology check
- [ ] Task 2: Mode-aware submit / JSON mapper and read-back

### Checkpoint: Domain
- [ ] Focused tests for validation, topology util and mapper pass

### Phase 2: UI
- [ ] Task 3: Topology step – selectable Managed, edit lock, locales
- [ ] Task 4: Builder – Managed flow without Existing data, lifecycle lock

### Checkpoint: Complete
- [ ] Focused tests for TopologyStep, Builder, locales pass; tsc/eslint on changed files clean
- [ ] Managed payload matches the expected JSON; Existing tests unchanged and green

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing regression via shared conditions in Builder | High | Keep every existing Builder/validation/mapper test untouched and green; only add Managed cases |
| Backend-derived ids submitted on managed update | High | Validation drops them for managed; mapper test asserts no `consistency_group_id` / `auxiliary_name` |
| Pushed managed group edited and re-provisioned | Med | Lifecycle lock in Builder + Builder test for pushed and partial-rollback states |

## Open Questions / Assumptions

- The "pushed=true → read-only" rule is applied to **Managed groups only**; Existing edit
  behaviour stays as today. Say if it should apply to all groups.
- The lock is enforced in the Builder (same place as today). The table's Edit action and
  `useRecoveryGroups.update` are not changed.
