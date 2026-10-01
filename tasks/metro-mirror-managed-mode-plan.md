# Implementation Plan: Metro Mirror mode="managed"

## Overview

Allow Recovery Groups with `topology="metro_mirror"` to choose `existing` or `managed`.
Existing keeps today's behaviour (CG id + auxiliary names, relationship lookup/prefill).
Managed sends only `metro_mirror: { mode: "managed" }` and volumes with `name`; the backend
provisions auxiliary volumes, relationships and the consistency group and may persist
`consistency_group_id` / `auxiliary_name`, which FE reads back but never submits.
The Builder also gets a lifecycle lock that mirrors the backend: a pushed Recovery Group
(any topology / mode) is read-only until it is rolled back.
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
  `mapRecoveryGroupApiRecord` already reads mode / CG / auxiliary names (keep as is);
  `pushToOrchestrator` comes from `orchestration.pushed`.
- `RecoveryGroupBuilder.tsx` – `metroExisting` gates lookup + `RecoveryGroupMetroMirrorFields`;
  `storageValid`, `renderVolumeContent`, `showAuxiliaryHint` key on `topology === 'metro_mirror'`
  only; `topologyValid` is false for any persisted managed group. A pushed group can be
  edited and saved today, although the backend rejects it.
- Backend `recovery/groups.py::_validate_not_pushed()` rejects any submit/update of an existing
  group with `orchestration.pushed === true`, regardless of topology or Metro Mirror mode.
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
- **Global lifecycle lock (all Recovery Groups)** – mirrors backend `_validate_not_pushed()`:
  - `initialData?.pushToOrchestrator === true` → the whole group is read-only, for every
    topology and mode (Local, Existing, Managed). Editing is possible only after a successful rollback.
  - Additionally for Managed: a persisted managed group with backend-generated
    `consistencyGroupId` or any `auxiliaryNamesByVolume` value is read-only even when
    `pushToOrchestrator` is false (partial rollback leaves derived ids for leftover objects).
  - A clean managed group (not pushed, no derived ids) is editable; its submit carries no
    `consistency_group_id` / `auxiliary_name`.
  - Read-only in the Builder means: a builder-level warning alert; step content wrapped in a
    disabled `<fieldset>` so no field, picker or remove button can change the draft; wizard step
    navigation, Back/Next and Cancel stay usable for viewing; Save/Create is disabled.
  - Replaces the current blanket `initialData?.metroMirrorMode !== 'managed'` condition in
    `topologyValid`.
- **Lookup stays Existing-only.** `useRecoveryGroupMetroMirrorRelationships` is already enabled
  only for `metroExisting`; Managed renders no `RecoveryGroupMetroMirrorFields` and no auxiliary inputs.
- **Locales:** drop "(unavailable)" from the Managed label; remove the now-unused
  `topology.errors.managed`; add `topology.managedHint` and the lifecycle-lock messages
  (`lifecycleLock.pushed`, `lifecycleLock.managedProvisioned`) in en/cs/sk.

## Task List

### Phase 1: Domain
- [ ] Task 1: Mode-split validation and topology check
- [ ] Task 2: Mode-aware submit / JSON mapper and read-back

### Checkpoint: Domain
- [ ] Focused tests for validation, topology util and mapper pass

### Phase 2: UI
- [ ] Task 3: Topology step – selectable Managed, edit lock, locales
- [ ] Task 4: Builder – global lifecycle lock for pushed groups
- [ ] Task 5: Builder – Managed flow without Existing data, managed provisioned lock

### Checkpoint: Complete
- [ ] Focused tests for TopologyStep, Builder, locales pass; tsc/eslint on changed files clean
- [ ] Managed payload matches the expected JSON; Existing tests green (only pushed-fixture adjustments from Task 4)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing regression via shared conditions in Builder | High | Keep existing Builder/validation/mapper tests green; only add Managed cases |
| Backend-derived ids submitted on managed update | High | Validation drops them for managed; mapper test asserts no `consistency_group_id` / `auxiliary_name` |
| Pushed group edited and saved (rejected by backend / re-provisioned) | High | Global lifecycle lock in Builder + tests for pushed Local, Existing and Managed |
| Existing Builder tests save a group with `initialData.pushToOrchestrator: true` (orchestration provider tests at `RecoveryGroupBuilder.test.tsx` ~376, ~395, ~515) | Med | Switch those fixtures to `pushToOrchestrator: false`; their intent (Airflow provider selection) is unchanged. No other assertions change |

## Open Questions / Assumptions

- The lock is enforced in the Builder (edit flow). The table's Edit action and
  `useRecoveryGroups.update` are not changed; the backend remains the final guard.
