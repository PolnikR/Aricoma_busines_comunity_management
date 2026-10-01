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
- **Until Phase 3 lands, Managed candidate eligibility is not guaranteed.** The current backend
  does not yet re-read Metro Mirror state or block Managed provisioning writes for a volume that
  already has a relationship – that is exactly what Task 9 adds. The FE must not implement
  client-side eligibility filtering as a workaround. Managed must not be considered
  production-ready until backend candidate eligibility (Tasks 7–8) and submit-time revalidation
  (Task 9) are implemented and the FE consumes server-driven candidates (Task 10).
- **Locales:** drop "(unavailable)" from the Managed label; remove the now-unused
  `topology.errors.managed`; add `topology.managedHint` and the lifecycle-lock messages
  (`lifecycleLock.pushed`, `lifecycleLock.managedProvisioned`) in en/cs/sk.

## Execution Rules

- Implement only one task at a time.
- Do not start the next task until the current task has:
  1. finished implementation,
  2. its focused tests / verification run and passing,
  3. a review of the result against its acceptance criteria,
  4. its own commit.
- After each task, update the checkboxes in `tasks/metro-mirror-managed-mode-todo.md` and report
  the task completion checkpoint defined there.
- Do not skip dependencies.
- Do not implement anything from later tasks "ahead of time", even when it looks simple.
- If a new backend/FE gap is found during a task, first record it in plan/todo or stop and tell
  the user; no hidden scope expansion.
- Before starting each task, re-read the relevant parts of this plan and the todo.
- Architecture Decisions and the Release Gate are binding for every task.
- No task may introduce client-side Metro Mirror eligibility filtering.
- Stop after the FE domain checkpoint (after Task 2) and wait for user confirmation before Task 3.

## Release Gate

**Tasks 1–2 (FE domain)**
- Can be implemented and committed on their own.
- Prepare domain validation and the submit mapper.
- Do not by themselves expose Managed to the user (the Managed option stays disabled in the UI).

**Tasks 3–5 (FE UI)**
- Can be developed and tested on the feature branch.
- The Managed UI must NOT be marked production-ready / merge-ready while the backend eligibility
  protections are missing.
- After Task 5 the status is only: **FE implementation complete on feature branch** – NOT
  "Managed feature complete / production-ready".

**Tasks 6–10 (BE eligibility + FE consumption)**
- Task 6 must be finished (and human-approved) before Tasks 7–10, because it defines the API contract.
- The Managed feature is COMPLETE / READY only when these are done:
  - Task 7 – Existing eligibility
  - Task 8 – Managed eligibility
  - Task 9 – submit-time revalidation
  - Task 10 – FE uses server-driven candidates

```text
Task 1
  ↓
Task 2
  ↓
FE domain checkpoint            (stop, wait for user confirmation)

Task 3
  ↓
Task 4
  ↓
Task 5
  ↓
FE implementation complete on branch – NOT production-ready

Task 6                          (human approval of contract)
  ↓
Task 7
  ↓
Task 8
  ↓
Task 9
  ↓
Task 10
  ↓
Managed Metro Mirror feature = production-ready
```

## Task List

### Phase 1: Domain (FE)
- [ ] Task 1: Mode-split validation and topology check
  – only validation + topology util; no UI enablement; no backend changes
- [ ] Task 2: Mode-aware submit mapper and read-back
  – only mapper / read-back contract; Managed submit is exactly `metro_mirror: { mode: "managed" }`
  with volumes as `{ name }`; never `consistency_group_id`, `auxiliary_name` or `target_pool`;
  read-back of backend-generated values preserved

### Checkpoint: FE domain
- [ ] Focused tests for validation, topology util and mapper pass
- [ ] Task 1–2 verified with the user; do not continue to Task 3 automatically

### Phase 2: UI (FE)
- [ ] Task 3: Topology step – Managed selectable only on CREATE, mode immutable on EDIT, locales;
  no candidate filtering
- [ ] Task 4: Builder – pushed=true → read-only for Local, Existing and Managed
- [ ] Task 5: Builder – Managed wizard without CG/aux inputs; clean-rollback Managed editable;
  partial-rollback Managed read-only; no Existing regression; no client-side eligibility filter

### Checkpoint: FE implementation complete on feature branch (NOT production-ready)
- [ ] Focused tests for TopologyStep, Builder, locales pass; tsc/eslint on changed files clean
- [ ] Managed payload matches the expected JSON; Existing tests green (only pushed-fixture adjustments from Task 4)

### Phase 3: Backend-owned Metro Mirror eligibility (BE)
- [ ] Task 6: Analyse relationship discovery contract and decide endpoint/contract (A vs B)
  – analysis only; **human approval required** before Tasks 7–10
- [ ] Task 7: Existing candidate rules, ambiguous exclusion, same-CG compatibility – depends on Task 6 approval
- [ ] Task 8: Managed candidate rules, ambiguous exclusion – depends on Task 6 approval
- [ ] Task 9: Submit-time revalidation immediately before storage write operations – depends on Task 6 contract
- [ ] Task 10: FE consumes the server-driven candidate contract – depends on Tasks 6, 7, 8
  (Task 9 should be available before final release); no FE eligibility logic

### Checkpoint: Managed Metro Mirror production-ready
- [ ] Backend acceptance tests from Tasks 7–9 pass
- [ ] FE shows only server-provided candidates per mode; review with human
- [ ] Feature Complete Criteria met

## Feature Complete Criteria

Managed Metro Mirror is complete only if:

**FE**
- Managed is selectable on CREATE.
- Mode is immutable on EDIT.
- Managed submit contract is correct (`metro_mirror: { mode: "managed" }`, volumes `{ name }`,
  no `consistency_group_id` / `auxiliary_name` / `target_pool`).
- Lifecycle locks are correct (pushed → read-only for all groups; partial-rollback Managed → read-only;
  clean Managed → editable).
- FE uses server-driven candidates.

**BE**
- Existing eligibility is server-owned.
- Managed eligibility is server-owned.
- Ambiguous volumes are excluded.
- Existing same-CG is enforced.
- Submit-time revalidation runs before any write.
- Managed provisioning is not started for an already-mirrored volume.

**And** all focused tests from Tasks 1–10 pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing regression via shared conditions in Builder | High | Keep existing Builder/validation/mapper tests green; only add Managed cases |
| Backend-derived ids submitted on managed update | High | Validation drops them; submit mapper never emits them for managed; mapper test asserts absence |
| Pushed group edited and saved (rejected by backend / re-provisioned) | High | Global lifecycle lock in Builder + tests for pushed Local, Existing and Managed |
| Storage changes between discovery and submit (volume gains a relationship, CG changes) | High | Task 9 submit-time revalidation before any write |
| Interim period: Managed picker lists already-mirrored volumes and today's backend does not reliably block provisioning for them | High | Release Gate: Managed is not production-ready/merge-ready before Tasks 7–10; no client-side filtering as a stopgap |
| Existing Builder tests save a group with `initialData.pushToOrchestrator: true` (orchestration provider tests at `RecoveryGroupBuilder.test.tsx` ~376, ~395, ~515) | Med | Switch those fixtures to `pushToOrchestrator: false`; their intent (Airflow provider selection) is unchanged |

## Open Questions / Assumptions

- The lock is enforced in the Builder (edit flow). The table's Edit action and
  `useRecoveryGroups.update` are not changed; the backend remains the final guard.
- Phase 3 is implemented in the backend repository; backend file paths and test commands beyond
  `recovery/groups.py` are confirmed in Task 6.
- Endpoint/contract choice (A vs B) is open until Task 6.
