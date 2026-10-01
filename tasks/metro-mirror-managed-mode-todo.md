# Todo: Metro Mirror mode="managed"

Plan: `tasks/metro-mirror-managed-mode-plan.md`

Execute strictly Task 1 → Task 2 → … one task at a time (see plan "Execution Rules" and
"Release Gate"). Re-read the relevant plan sections before each task. No client-side Metro Mirror
eligibility filtering in any task.

**Task completion checkpoint** – after every task, report all of the following before starting
the next task:

- Changed files:
- What changed:
- Acceptance criteria status:
- Verification command(s):
- Verification result:
- Commit:
- Any discovered follow-up / blocker:

## Task 1: Mode-split validation and topology check

**Scope:** only validation + topology util. No UI enablement (Managed option stays disabled).
No backend changes.

**Description:** `validateRecoveryGroupDraft` accepts `managed` without CG id / auxiliary names and keeps
requiring them for `existing`. `getRecoveryGroupTopologyError` accepts `managed` with the same
source/partner checks as `existing`.

**Acceptance criteria:**
- [x] Managed (vm and volume) without `consistencyGroupId` / `auxiliaryNamesByVolume` validates; result has `metroMirrorMode: 'managed'`, `consistencyGroupId: null`, `auxiliaryNamesByVolume: {}` even if the draft carried persisted values
- [x] Managed still requires source provider (vm) and ≥1 source volume; Existing still requires CG id + every auxiliary; `managed` with `local` topology normalises to `metroMirrorMode: null`
- [x] Topology util returns `null` for valid managed, partner errors as for existing, `modeRequired` for null mode

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts`

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts` (+ test)
- `src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.ts` (+ test)

**Estimated scope:** Small

**Completion checkpoint:**
- [x] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Task 2: Mode-aware submit mapper and read-back

**Scope:** only mapper / read-back contract. No UI changes.

**Description:** `toRecoveryGroupSubmitPayload` emits `metro_mirror` per mode. Managed submit is exactly:

```json
{
  "topology": "metro_mirror",
  "metro_mirror": { "mode": "managed" },
  "volumes": [{ "name": "SOURCE_VOLUME" }]
}
```

It never emits `consistency_group_id`, `auxiliary_name` or `target_pool`, whatever the draft holds.
Persisted backend-generated values are preserved only on read-back via `mapRecoveryGroupApiRecord`.

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

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Checkpoint: FE domain
- [ ] Task 1 + 2 focused tests pass
- [ ] Task 1–2 verified with the user – **stop here; do not continue to Task 3 automatically**

## Task 3: Topology step – selectable Managed, mode immutable in edit, locales

**Scope:** Managed selectable only on CREATE; mode immutable on EDIT; no candidate filtering.

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

**Dependencies:** Task 1, 2 (FE domain checkpoint confirmed)

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.tsx` (+ test)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`
- `src/locales/recoveryGroupTopologyTranslations.test.ts`

**Estimated scope:** Medium

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Task 4: Builder – global lifecycle lock for pushed groups

**Scope:** pushed=true → read-only for Local, Existing and Managed.

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

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx` (+ test)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Estimated scope:** Small–Medium

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Task 5: Builder – Managed flow without Existing data, managed rollback lock

**Scope:** Managed wizard works without CG/aux inputs; clean-rollback Managed editable;
partial-rollback Managed read-only; no Existing regression; no client-side eligibility filter.

**Description:** Split Builder conditions by mode: `storageValid`, auxiliary inputs, hint and
`RecoveryGroupMetroMirrorFields` only for existing; managed needs only ≥1 selected volume and shows
backend-derived auxiliary names read-only when present. Replace the blanket managed block in
`topologyValid` with the lifecycle lock from Task 4, extended by the Managed rollback lifecycle:
- Managed + pushed=true → read-only (Task 4).
- Successful rollback → pushed=false, CG id and auxiliary names cleared by backend → clean, editable; next push re-provisions.
- Partial rollback → pushed=false but derived CG id or auxiliary name remain → read-only.

**Acceptance criteria:**
- [ ] New group: choose Metro → Managed, pick source + volumes, finish wizard and `onCreate` gets `metroMirrorMode: 'managed'`; relationship hook is called with `enabled=false`; no CG / auxiliary inputs rendered; volume list is not filtered on FE
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

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Checkpoint: FE implementation complete on feature branch (NOT production-ready)
- [ ] All FE focused tests above pass; full suite / production build not run unless requested
- [ ] Final Managed request JSON shown to the user with list of changed files
- [ ] Status reported as "FE implementation complete on feature branch" – **not** "Managed feature complete / production-ready" (Release Gate)

## Task 6: Analyse relationship discovery contract and decide endpoint/contract (BE)

**Scope:** analysis / API contract decision only. No implementation.
**Human approval required before Tasks 7–10 start.**

**Description:** Analyse the current `/get_metro_mirror_relationships` contract (statuses,
per-volume `auxiliary_name`, single `consistency_group_id`, ambiguity handling) and decide between
(A) extending it with a mode/eligibility contract and (B) a separate Recovery Group candidates
endpoint. The result must be server-driven; no client-side filtering, not even as a stopgap.

**Acceptance criteria:**
- [ ] Written decision (A or B) with the request/response contract: mode input, per-volume eligibility + reason, per-volume CG id for Existing
- [ ] Contract covers Existing rules, Managed rules, ambiguous exclusion and Existing same-CG compatibility
- [ ] Backend files and focused test commands identified

**Verification:**
- [ ] Decision reviewed and approved by human

**Dependencies:** FE checkpoint after Task 5

**Files likely touched:**
- Backend repo: `recovery/groups.py`, relationship discovery module (TBD); decision note/ADR

**Estimated scope:** Small (analysis)

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

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

**Dependencies:** **Task 6 approval**

**Files likely touched:**
- Backend repo (TBD in Task 6)

**Estimated scope:** Medium

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

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

**Dependencies:** **Task 6 approval**, Task 7

**Files likely touched:**
- Backend repo (TBD in Task 6)

**Estimated scope:** Small–Medium

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

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

**Dependencies:** **Task 6 contract**, Task 8 (rules shared with Tasks 7–8)

**Files likely touched:**
- Backend repo: `recovery/groups.py` and provisioning module (TBD in Task 6)

**Estimated scope:** Medium

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Task 10: FE consumes the server-driven candidate contract

**Scope:** FE only consumes server-driven candidates; no own eligibility logic.

**Description:** After Task 6 is decided and the backend is available, regenerate the API client
and have the volume pickers show only server-provided candidates for the selected mode.

**Acceptance criteria:**
- [ ] Existing and Managed pickers list exactly the backend-eligible volumes for the chosen mode
- [ ] Backend exclusion reasons (not mirrored / already mirrored / ambiguous / CG mismatch) are surfaced, not recomputed on FE
- [ ] No FE code filters candidates by relationship status

**Verification:**
- [ ] Focused tests for the affected hook/components (paths TBD after Task 6)

**Dependencies:** **Tasks 6, 7, 8** (backend deployed), Task 5; Task 9 should be available before final release

**Files likely touched:**
- Generated API (regenerated, not hand-edited), recovery group hooks/components (TBD)

**Estimated scope:** Medium

**Completion checkpoint:**
- [ ] Changed files / What changed / Acceptance criteria status / Verification command(s) / Verification result / Commit / Follow-up or blocker reported

## Checkpoint: Managed Metro Mirror production-ready
- [ ] Backend acceptance tests from Tasks 7–9 pass
- [ ] FE pickers driven by backend candidates; human review
- [ ] All Feature Complete Criteria in the plan met; all focused tests from Tasks 1–10 passed
