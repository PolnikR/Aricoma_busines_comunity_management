# Implementation Plan: Metro Mirror mode="managed"

## Overview

Allow Recovery Groups with `topology="metro_mirror"` to choose `existing` or `managed`.
Existing keeps today's behaviour (CG id + auxiliary names, relationship lookup/prefill).
Managed sends only `metro_mirror: { mode: "managed" }` and volumes with `name`; the backend
provisions auxiliary volumes, relationships and the consistency group and may persist
`consistency_group_id` / `auxiliary_name`, which FE reads back but never submits.
The Builder also gets a lifecycle lock that mirrors the backend: a pushed Recovery Group
(any topology / mode) is read-only until it is rolled back.

Scope is split:
- **Phases 1–2 (FE, this repo):** mode selection, validation, mapper, Builder flow, lifecycle lock.
  No generated Orval changes, no `target_pool`.
- **Phase 3 (BE, backend repo):** backend-owned Metro Mirror volume eligibility, Existing
  same-CG compatibility and submit-time revalidation. The FE must not replace any of it with
  client-side filtering. The API contract is decided in Task 6, not upfront.

## Current flow (analysis)

- `RecoveryGroupTopologyStep.tsx` – mode select hardcodes `metroMirrorMode: 'existing'`,
  Managed option is `disabled`; topology/source/mode selects are `disabled={managed}`.
- `recoveryGroupTopology.ts` – `getRecoveryGroupTopologyError` returns `'managed'` for managed
  and `'modeRequired'` for anything but existing.
- `recoveryGroupsValidation.ts` – throws for managed; `metroMirrorMode: 'existing' | null`;
  requires CG id + every auxiliary for any metro_mirror.
- `mapRecoveryGroups.ts` – `toRecoveryGroupSubmitPayload` hardcodes `mode: 'existing'`;
  `toVolumesPayload` always emits `auxiliary_name` (fallback `''`) for metro_mirror and is
  shared by the submit mapper and the `toRecoveryGroupJson` fallback.
  `mapRecoveryGroupApiRecord` already reads mode / CG / auxiliary names (keep as is);
  `pushToOrchestrator` comes from `orchestration.pushed`.
- `RecoveryGroupBuilder.tsx` – `metroExisting` gates lookup + `RecoveryGroupMetroMirrorFields`;
  `storageValid`, `renderVolumeContent`, `showAuxiliaryHint` key on `topology === 'metro_mirror'`
  only; `topologyValid` is false for any persisted managed group. A pushed group can be
  edited and saved today, although the backend rejects it.
- `GET /get_metro_mirror_relationships` (via `useRecoveryGroupMetroMirrorRelationships`) returns
  per-volume `status` / `auxiliary_name` and one `consistency_group_id`; FE uses it only to prefill
  Existing. It has no mode/eligibility semantics.
- Backend `recovery/groups.py::_validate_not_pushed()` rejects any submit/update of an existing
  group with `orchestration.pushed === true`, regardless of topology or Metro Mirror mode.
- `useRecoveryGroups.ts` – create and update both go through `validate → topology check →
  toRecoveryGroupSubmitPayload`; no change needed beyond what validation/topology provide.

## Architecture Decisions

- **Validation is mode-split.** Shared metro checks (source provider, ≥1 source volume) stay;
  CG id + auxiliary names are required only for `existing`. For `managed` the validated draft
  carries `consistencyGroupId: null` and `auxiliaryNamesByVolume: {}`, so persisted
  backend-generated values can never leak into a submit.
- **Managed submit mapper never emits derived ids.** For `managed`, `toRecoveryGroupSubmitPayload`
  emits exactly `metro_mirror: { mode: "managed" }` and volumes as bare `{ name }` – never
  `consistency_group_id`, `auxiliary_name` or `target_pool`, regardless of what the draft holds.
  Existing submit is unchanged (`consistency_group_id` + `auxiliary_name` per volume).
  Persisted backend-generated values are preserved only on **read-back** via
  `mapRecoveryGroupApiRecord` (+ `rawRecord` for the JSON view).
- **Mode is immutable after create** (user decision).
  - Existing/Managed is chosen only when creating a Recovery Group.
  - In edit, the mode select is disabled for both Existing and Managed.
  - Existing → Managed and Managed → Existing are not allowed through edit; changing mode
    means creating a new Recovery Group.
  - Topology/source additionally stay locked for a persisted managed group (as today).
- **Global lifecycle lock (all Recovery Groups)** – mirrors backend `_validate_not_pushed()`:
  `initialData?.pushToOrchestrator === true` → the whole group is read-only, for every
  topology and mode (Local, Existing, Managed). Editing is possible only after a successful rollback.
- **Managed rollback lifecycle:**
  ```text
  Managed + pushed=true
    → read-only

  Successful rollback
    → pushed=false
    → backend removes the Managed Metro Mirror infrastructure
    → consistency_group_id is cleared
    → auxiliary_name is cleared
    → group is clean and editable again
    → the next push provisions the Managed infrastructure anew

  Partial rollback
    → pushed=false, but derived consistency_group_id or auxiliary_name remain
    → group stays read-only
  ```
  FE rule: a persisted managed group is editable only when `pushToOrchestrator !== true` and it
  has no `consistencyGroupId` and no `auxiliaryNamesByVolume` value.
- **Read-only in the Builder** means: a builder-level warning alert; step content wrapped in a
  disabled `<fieldset>` so no field, picker or remove button can change the draft; wizard step
  navigation, Back/Next and Cancel stay usable for viewing; Save/Create is disabled. Replaces the
  current blanket `initialData?.metroMirrorMode !== 'managed'` condition in `topologyValid`.
- **Lookup stays Existing-only.** `useRecoveryGroupMetroMirrorRelationships` is already enabled
  only for `metroExisting`; Managed renders no `RecoveryGroupMetroMirrorFields` and no auxiliary inputs.
- **Backend owns volume eligibility.** The FE does no business filtering of Metro Mirror
  candidates. The backend decides, per mode, which volumes are eligible:
  - Existing: only a volume with exactly one existing Metro Mirror relationship, with an
    `auxiliary_name` and a usable `consistency_group_id`; `not_mirrored` and `ambiguous` excluded.
  - Managed: only a volume without an existing Metro Mirror relationship (equivalent to
    `status=not_mirrored`); `existing`/`ok` and `ambiguous` excluded.
- **Existing CG compatibility.** All volumes of one Existing Recovery Group must belong to one
  consistency group (VOL1→AUX1→CG7 + VOL2→AUX2→CG7 valid; CG7 + CG9 invalid). The backend
  contract and submit validation enforce this.
- **API design is not decided yet.** Task 6 evaluates (A) extending
  `/get_metro_mirror_relationships` with a mode/eligibility contract vs. (B) a separate
  Recovery Group candidates endpoint. The result must be server-driven; no interim client-side filtering.
- **Submit-time revalidation.** Discovery/candidate responses are advisory only. On submit /
  provisioning the backend re-reads current storage state before any write: Managed checks the
  source volume still has no Metro Mirror relationship before provisioning; Existing checks the
  declared relationships / auxiliary names / CG still match storage.
- **Until Phase 3 lands**, the FE Managed volume picker shows the normal inventory without
  filtering; backend submit validation is the guard.
- **Locales:** drop "(unavailable)" from the Managed label; remove the now-unused
  `topology.errors.managed`; add `topology.managedHint` and the lifecycle-lock messages
  (`lifecycleLock.pushed`, `lifecycleLock.managedProvisioned`) in en/cs/sk.

## Task List

### Phase 1: Domain (FE)
- [ ] Task 1: Mode-split validation and topology check
- [ ] Task 2: Mode-aware submit mapper and read-back

### Checkpoint: Domain
- [ ] Focused tests for validation, topology util and mapper pass

### Phase 2: UI (FE)
- [ ] Task 3: Topology step – selectable Managed, mode immutable in edit, locales
- [ ] Task 4: Builder – global lifecycle lock for pushed groups
- [ ] Task 5: Builder – Managed flow without Existing data, managed rollback lock

### Checkpoint: FE complete
- [ ] Focused tests for TopologyStep, Builder, locales pass; tsc/eslint on changed files clean
- [ ] Managed payload matches the expected JSON; Existing tests green (only pushed-fixture adjustments from Task 4)

### Phase 3: Backend-owned Metro Mirror eligibility (BE)
- [ ] Task 6: Analyse relationship discovery contract and decide endpoint/contract (A vs B)
- [ ] Task 7: Existing candidate rules, ambiguous exclusion, same-CG compatibility
- [ ] Task 8: Managed candidate rules, ambiguous exclusion
- [ ] Task 9: Submit-time revalidation before storage write operations
- [ ] Task 10: FE consumes the server-driven candidate contract (no client filtering)

### Checkpoint: Eligibility complete
- [ ] Backend acceptance tests from Tasks 7–9 pass
- [ ] FE shows only server-provided candidates per mode; review with human

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing regression via shared conditions in Builder | High | Keep existing Builder/validation/mapper tests green; only add Managed cases |
| Backend-derived ids submitted on managed update | High | Validation drops them; submit mapper never emits them for managed; mapper test asserts absence |
| Pushed group edited and saved (rejected by backend / re-provisioned) | High | Global lifecycle lock in Builder + tests for pushed Local, Existing and Managed |
| Storage changes between discovery and submit (volume gains a relationship, CG changes) | High | Task 9 submit-time revalidation before any write |
| Interim period: Managed picker lists already-mirrored volumes | Med | Backend submit rejects them (Task 9); no client-side filtering added as a stopgap |
| Existing Builder tests save a group with `initialData.pushToOrchestrator: true` (orchestration provider tests at `RecoveryGroupBuilder.test.tsx` ~376, ~395, ~515) | Med | Switch those fixtures to `pushToOrchestrator: false`; their intent (Airflow provider selection) is unchanged |

## Open Questions / Assumptions

- The lock is enforced in the Builder (edit flow). The table's Edit action and
  `useRecoveryGroups.update` are not changed; the backend remains the final guard.
- Phase 3 is implemented in the backend repository; backend file paths and test commands beyond
  `recovery/groups.py` are confirmed in Task 6.
- Endpoint/contract choice (A vs B) is open until Task 6.
