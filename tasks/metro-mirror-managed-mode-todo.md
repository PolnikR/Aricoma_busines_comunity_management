# Todo: Metro Mirror mode="managed"

Plan: `tasks/metro-mirror-managed-mode-plan.md`

## Task 1: Mode-split validation and topology check

**Description:** `validateRecoveryGroupDraft` accepts `managed` without CG id / auxiliary names and keeps
requiring them for `existing`. `getRecoveryGroupTopologyError` accepts `managed` with the same
source/partner checks as `existing`.

**Acceptance criteria:**
- [ ] Managed (vm and volume) without `consistencyGroupId` / `auxiliaryNamesByVolume` validates; result has `metroMirrorMode: 'managed'`, `consistencyGroupId: null`, `auxiliaryNamesByVolume: {}` even if the draft carried persisted values
- [ ] Managed still requires source provider (vm) and ≥1 source volume; Existing still requires CG id + every auxiliary; `managed` with `local` topology normalises to `metroMirrorMode: null`
- [ ] Topology util returns `null` for valid managed, partner errors as for existing, `modeRequired` for null mode

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts`

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts` (+ test)
- `src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.ts` (+ test)

**Estimated scope:** Small

## Task 2: Mode-aware submit mapper and read-back

**Description:** `toRecoveryGroupSubmitPayload` emits `metro_mirror` per mode. The Managed submit
mapper never emits `auxiliary_name`, `consistency_group_id` or `target_pool`, whatever the draft
holds. Persisted backend-generated values are preserved only on read-back via `mapRecoveryGroupApiRecord`.

**Acceptance criteria:**
- [ ] Existing payload unchanged: `{ mode: 'existing', consistency_group_id }` + `auxiliary_name` per volume
- [ ] Managed payload: `metro_mirror` equals exactly `{ mode: 'managed' }` and volumes equal bare `{ name }` – also when the source draft/group carries a CG id and auxiliary names
- [ ] Persisted managed record with backend CG id + auxiliary names maps to `metroMirrorMode: 'managed'`, `consistencyGroupId`, `auxiliaryNamesByVolume` (read-back test)

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts` (+ test)

**Estimated scope:** Small

## Checkpoint: Domain
- [ ] Task 1 + 2 focused tests pass

## Task 3: Topology step – selectable Managed, mode immutable in edit, locales

**Description:** Managed option enabled for new groups; mode select stores the chosen value and
clears CG/aux; topology/source no longer disabled for a new managed draft. New `isEditing` prop
disables the mode select for both Existing and Managed (mode is immutable after create; changing
mode means a new Recovery Group) and keeps topology/source locked for a managed draft. Managed
shows a short hint that ABCO provisions the Metro Mirror infrastructure.

**Acceptance criteria:**
- [ ] New group: Managed option is not disabled; selecting it calls `onChange({ metroMirrorMode: 'managed', consistencyGroupId: '', auxiliaryNamesByVolume: {} })`; selecting Metro topology still defaults to `existing`
- [ ] With `isEditing` the mode select is disabled for Existing and Managed (no Existing ↔ Managed switch); topology/source disabled only for a managed draft
- [ ] Locales en/cs/sk: Managed label without "(unavailable)", `errors.managed` removed, `managedHint` added; translation test updated

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx src/locales/recoveryGroupTopologyTranslations.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.tsx` (+ test)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`
- `src/locales/recoveryGroupTopologyTranslations.test.ts`

**Estimated scope:** Medium

## Task 4: Builder – global lifecycle lock for pushed groups

**Description:** Mirror backend `_validate_not_pushed()`: when `initialData?.pushToOrchestrator === true`
the whole Recovery Group is read-only, for every topology and mode (Local, Existing, Managed).
Editing is possible only after a successful rollback. The Builder shows a warning alert, wraps
the step content in a disabled `<fieldset>`, keeps step navigation / Back / Next / Cancel usable
for viewing and disables Save.

**Acceptance criteria:**
- [ ] Pushed Local, Existing and Managed groups: warning shown, step inputs disabled, Save disabled, `onCreate` never called
- [ ] Not-pushed groups and new groups behave as today
- [ ] Builder tests that save a group with `initialData.pushToOrchestrator: true` (~376, ~395, ~515) use `pushToOrchestrator: false`; their other assertions are unchanged
- [ ] Locales en/cs/sk: `lifecycleLock.pushed` added

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx` (+ test)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Estimated scope:** Small–Medium

## Task 5: Builder – Managed flow without Existing data, managed rollback lock

**Description:** Split Builder conditions by mode: `storageValid`, auxiliary inputs, hint and
`RecoveryGroupMetroMirrorFields` only for existing; managed needs only ≥1 selected volume and shows
backend-derived auxiliary names read-only when present. Replace the blanket managed block in
`topologyValid` with the lifecycle lock from Task 4, extended by the Managed rollback lifecycle:
- Managed + pushed=true → read-only (Task 4).
- Successful rollback → pushed=false, CG id and auxiliary names cleared by backend → clean, editable; next push re-provisions.
- Partial rollback → pushed=false but derived CG id or auxiliary name remain → read-only.

**Acceptance criteria:**
- [ ] New group: choose Metro → Managed, pick source + volumes, finish wizard and `onCreate` gets `metroMirrorMode: 'managed'`; relationship hook is called with `enabled=false`; no CG / auxiliary inputs rendered
- [ ] Clean managed group (pushed=false, no derived ids – successful rollback) can be saved; managed group with derived ids and pushed=false (partial rollback) is read-only with `lifecycleLock.managedProvisioned` warning
- [ ] All existing Existing-mode Builder tests pass unchanged

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [ ] `npx tsc --noEmit -p .` and eslint on changed files

**Dependencies:** Task 1, 2, 3, 4

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx` (+ test)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Estimated scope:** Small–Medium

## Checkpoint: FE complete
- [ ] All FE focused tests above pass; full suite / production build not run unless requested
- [ ] Final Managed request JSON shown to the user with list of changed files

## Task 6: Analyse relationship discovery contract and decide endpoint/contract (BE)

**Description:** Analyse the current `/get_metro_mirror_relationships` contract (statuses,
per-volume `auxiliary_name`, single `consistency_group_id`, ambiguity handling) and decide between
(A) extending it with a mode/eligibility contract and (B) a separate Recovery Group candidates
endpoint. The result must be server-driven; no client-side filtering, not even as a stopgap.

**Acceptance criteria:**
- [ ] Written decision (A or B) with the request/response contract: mode input, per-volume eligibility + reason, per-volume CG id for Existing
- [ ] Contract covers Existing rules, Managed rules, ambiguous exclusion and Existing same-CG compatibility
- [ ] Backend files and focused test commands identified; human review before Tasks 7–10

**Verification:**
- [ ] Decision reviewed and approved by human

**Dependencies:** None

**Files likely touched:**
- Backend repo: `recovery/groups.py`, relationship discovery module (TBD); decision note/ADR

**Estimated scope:** Small (analysis)

## Task 7: Existing candidate rules, ambiguous exclusion, same-CG compatibility (BE)

**Description:** Backend returns Existing candidates per the Task 6 contract: only volumes with
exactly one existing Metro Mirror relationship, an `auxiliary_name` and a usable
`consistency_group_id`. `not_mirrored` and `ambiguous` are excluded. Volumes of one Existing
Recovery Group must share one CG.

**Acceptance criteria / tests:**
- [ ] Existing candidates: mirrored + valid CG → eligible
- [ ] Existing candidates: not mirrored → excluded; ambiguous → excluded
- [ ] Existing multi-volume: same CG (VOL1→AUX1→CG7, VOL2→AUX2→CG7) → valid; different CG (CG7 + CG9) → invalid as one Recovery Group

**Verification:**
- [ ] Backend focused tests (command from Task 6)

**Dependencies:** Task 6

**Files likely touched:**
- Backend repo (TBD in Task 6)

**Estimated scope:** Medium

## Task 8: Managed candidate rules, ambiguous exclusion (BE)

**Description:** Backend returns Managed candidates per the Task 6 contract: only volumes without
an existing Metro Mirror relationship (equivalent to `status=not_mirrored`). `existing`/`ok` and
`ambiguous` are excluded.

**Acceptance criteria / tests:**
- [ ] Managed candidates: not mirrored → eligible
- [ ] Managed candidates: already mirrored → excluded
- [ ] Managed candidates: ambiguous → excluded

**Verification:**
- [ ] Backend focused tests (command from Task 6)

**Dependencies:** Task 6

**Files likely touched:**
- Backend repo (TBD in Task 6)

**Estimated scope:** Small–Medium

## Task 9: Submit-time revalidation before storage write operations (BE)

**Description:** Candidate responses are advisory. On submit/provisioning the backend re-reads the
current Metro Mirror state immediately before any storage write. Managed: verify each source volume
still has no Metro Mirror relationship, only then provision. Existing: verify the declared
relationships, auxiliary names and the single CG still match storage.

**Acceptance criteria / tests:**
- [ ] State is revalidated immediately before write operations (no write when revalidation fails)
- [ ] Managed provisioning is not started for a volume that gained a Metro Mirror relationship after discovery
- [ ] Existing submit is rejected when declared relationships / CG no longer match storage, including mixed CGs

**Verification:**
- [ ] Backend focused tests (command from Task 6)

**Dependencies:** Task 6 (rules shared with Tasks 7–8)

**Files likely touched:**
- Backend repo: `recovery/groups.py` and provisioning module (TBD in Task 6)

**Estimated scope:** Medium

## Task 10: FE consumes the server-driven candidate contract

**Description:** After Task 6 is decided and the backend is available, regenerate the API client
and have the volume pickers show only server-provided candidates for the selected mode. No
client-side eligibility logic.

**Acceptance criteria:**
- [ ] Existing and Managed pickers list exactly the backend-eligible volumes for the chosen mode
- [ ] Backend exclusion reasons (not mirrored / already mirrored / ambiguous / CG mismatch) are surfaced, not recomputed on FE
- [ ] No FE code filters candidates by relationship status

**Verification:**
- [ ] Focused tests for the affected hook/components (paths TBD after Task 6)

**Dependencies:** Task 6, 7, 8 (backend deployed), Task 5

**Files likely touched:**
- Generated API (regenerated, not hand-edited), recovery group hooks/components (TBD)

**Estimated scope:** Medium

## Checkpoint: Eligibility complete
- [ ] Backend acceptance tests from Tasks 7–9 pass
- [ ] FE pickers driven by backend candidates; human review
- [ ] Commit per task
