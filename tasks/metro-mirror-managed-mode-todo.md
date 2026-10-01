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

## Task 2: Mode-aware submit / JSON mapper and read-back

**Description:** `toRecoveryGroupSubmitPayload` emits `metro_mirror` per mode; `toVolumesPayload`
emits `auxiliary_name` always for existing and only when present for managed.

**Acceptance criteria:**
- [ ] Existing payload unchanged: `{ mode: 'existing', consistency_group_id }` + `auxiliary_name` per volume
- [ ] Managed payload: `metro_mirror` equals exactly `{ mode: 'managed' }` (no `consistency_group_id`, no `target_pool`), volumes are bare `{ name }`
- [ ] Persisted managed record with backend CG id + auxiliary names maps to `metroMirrorMode: 'managed'`, `consistencyGroupId`, `auxiliaryNamesByVolume`; validating + submitting that group drops them

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts` (+ test)

**Estimated scope:** Small

## Checkpoint: Domain
- [ ] Task 1 + 2 focused tests pass

## Task 3: Topology step – selectable Managed, edit lock, locales

**Description:** Managed option enabled; mode select stores the chosen value and clears CG/aux;
topology/source no longer disabled for a new managed draft. New `isEditing` prop locks the mode
select (and topology/source for a managed draft); `managedLocked` prop shows a read-only warning.
Managed shows a short hint that ABCO provisions the Metro Mirror infrastructure.

**Acceptance criteria:**
- [ ] Managed option is not disabled; selecting it calls `onChange({ metroMirrorMode: 'managed', consistencyGroupId: '', auxiliaryNamesByVolume: {} })`; selecting Metro topology still defaults to `existing`
- [ ] With `isEditing` the mode select is disabled; topology/source disabled only for a managed draft
- [ ] Locales en/cs/sk: Managed label without "(unavailable)", `errors.managed` removed, `managedHint` + `managedLocked` added; translation test updated

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx src/locales/recoveryGroupTopologyTranslations.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.tsx` (+ test)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`
- `src/locales/recoveryGroupTopologyTranslations.test.ts`

**Estimated scope:** Medium

## Task 4: Builder – Managed flow without Existing data, lifecycle lock

**Description:** Split Builder conditions by mode: `storageValid`, auxiliary inputs, hint and
`RecoveryGroupMetroMirrorFields` only for existing; managed needs only ≥1 selected volume and shows
backend-derived auxiliary names read-only when present. Replace the blanket managed block with the
lifecycle lock (pushed or derived ids present → locked).

**Acceptance criteria:**
- [ ] New group: choose Metro → Managed, pick source + volumes, finish wizard and `onCreate` gets `metroMirrorMode: 'managed'`; relationship hook is called with `enabled=false`; no CG / auxiliary inputs rendered
- [ ] Clean persisted managed group (not pushed, no derived ids) can be saved; pushed or partial-rollback managed group cannot (Next / later steps disabled, warning shown)
- [ ] All existing Builder tests pass unchanged (Existing behaviour)

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [ ] `npx tsc --noEmit -p .` and eslint on changed files

**Dependencies:** Task 1, 2, 3

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx` (+ test)

**Estimated scope:** Small–Medium

## Checkpoint: Complete
- [ ] All focused tests above pass; full suite / production build not run unless requested
- [ ] Final Managed request JSON shown to the user with list of changed files
- [ ] Commit per task
