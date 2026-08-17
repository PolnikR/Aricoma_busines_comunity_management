# Todo: Multiple FlashCopy Providers per Recovery Group

See `tasks/recovery-group-multi-flashsystem-plan.md` for full context.

## Task 1: Specify and request the provider API change

**Description:** Write up a concrete API change request for whoever owns
the backend: `GET /providers` should return `flashcopyProviderIds:
string[]` on VMWARE/IBM_POWER provider records instead of the current
singular `defaultFlashcopyProviderId: string | null`. Include the current
shape, the proposed shape, and why (VMs behind one compute provider can be
backed by more than one physical FlashSystem array; the frontend cannot
discover or attach volumes from an array that isn't in this field today).

**Acceptance criteria:**
- [ ] A written request/ticket exists describing old shape, new shape,
      and the motivating scenario
- [ ] Backend owner has acknowledged or scheduled the change

**Verification:**
- [ ] Tests pass: N/A (no code in this task)
- [ ] Build succeeds: N/A
- [ ] Manual check: confirmation from the backend owner that the request
      was received and understood

**Dependencies:** None

**Files likely touched:** None (external handoff artifact)

**Estimated scope:** N/A — no code

---

## Task 2: Specify and request the recovery group API change

**Description:** Write up the companion API change request: the
recovery-groups GET/submit contract should replace the singular
`provider_id_volume: string` + `volumes: {name}[]` with an array —
`related_storage: [{ provider_id_volume: string, volumes: [{name:
string}] }]` — so one group can record volumes from more than one
FlashCopy provider. Note the migration question for already-saved groups
under the old shape.

**Acceptance criteria:**
- [ ] A written request/ticket exists describing old shape, new shape,
      and the migration concern for existing data
- [ ] Backend owner has acknowledged or scheduled the change

**Verification:**
- [ ] Tests pass: N/A (no code in this task)
- [ ] Build succeeds: N/A
- [ ] Manual check: confirmation from the backend owner

**Dependencies:** None (can be requested alongside Task 1)

**Files likely touched:** None (external handoff artifact)

**Estimated scope:** N/A — no code

---

## Checkpoint: Backend contract confirmed

- [ ] Both API changes are live (or a staging environment reflects them)
- [ ] A real response has been seen with `flashcopyProviderIds` as an array
- [ ] A real response/payload has been seen with `related_storage` as an array
- [ ] **Do not begin Task 3 until this is true** — there is nothing to
      implement or test against before this point

---

## Task 3: Update ProviderRecord/providersSchema to flashcopyProviderIds

**Description:** In `src/features/providers-connectors/providers/model/providerTypes.ts`,
replace `defaultFlashcopyProviderId?: string | null | undefined` with
`flashcopyProviderIds: string[]` (default `[]` when absent). Update
`providersSchema.ts`'s zod schema to match (`z.array(z.string().min(1))`,
defaulting to `[]`). Update every current reader of the old field.

**Acceptance criteria:**
- [ ] `ProviderRecord.flashcopyProviderIds: string[]` replaces the old field
- [ ] `providersResponseSchema` parses the new array shape (and the old
      shape is no longer expected/supported once the backend has migrated)
- [ ] No remaining references to `defaultFlashcopyProviderId` anywhere in `src/`

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/providers-connectors --no-coverage`
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: fetch `/providers` against the updated backend and
      confirm the array parses without a schema error

**Dependencies:** Checkpoint after Task 2

**Files likely touched:**
- `src/features/providers-connectors/providers/model/providerTypes.ts`
- `src/features/providers-connectors/providers/api/schemas/providersSchema.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Small: 3 files

---

## Task 4: Update VirtualMachineDetailPanel to fan out across candidates

**Description:** `VirtualMachineDetailPanel.tsx` currently does
`provider.id === vmProvider?.defaultFlashcopyProviderId` to find a single
FlashCopy provider before calling `useVdisksByVm`. With an array field,
decide and implement a fan-out: query `useVdisksByVm` against every
connected candidate in `flashcopyProviderIds` (filtered to
`credentialStatus === 'ok'`) and merge the results, same pattern as the
recovery-group hook from Task 7.

**Acceptance criteria:**
- [ ] A VM whose volumes live on any one of its provider's linked
      FlashCopy providers shows its snapshot/volume data correctly
- [ ] No behavior change for the common case of exactly one linked
      FlashCopy provider

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx --no-coverage`
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: open a VM detail panel for a VM behind a
      multi-FlashCopy-provider setup, confirm volumes resolve

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx`

**Estimated scope:** Small: 2 files

---

## Task 5: Update RecoveryGroup/RecoveryGroupDraft to relatedStorage array

**Description:** In `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`,
replace `relatedVolumeProviderId: string | null` + `relatedVolumes:
string[]` with `relatedStorage: { providerId: string; volumes: string[]
}[]` on both `RecoveryGroup` and `RecoveryGroupDraft`.

**Acceptance criteria:**
- [ ] Both types use the new `relatedStorage` array shape
- [ ] No remaining references to `relatedVolumeProviderId`/`relatedVolumes`
      anywhere in `src/`

**Verification:**
- [ ] Tests pass: N/A directly (type-only change; covered by Task 6/8 tests)
- [ ] Build succeeds: `npm run typecheck` (expect cascading errors in
      Tasks 6–8's files until they're updated too — this task and Task 6
      are effectively one atomic change in practice)
- [ ] Manual check: none beyond typecheck

**Dependencies:** Checkpoint after Task 2

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`

**Estimated scope:** XS: 1 file (drives type errors elsewhere, fixed in Task 6)

---

## Task 6: Update recovery-group schema, validation, and mapping

**Description:** Update `recoveryGroupsSchema.ts` (`related_storage` array
in `RecoveryGroupApiRecord`/`RecoveryGroupSubmitPayload`),
`recoveryGroupsValidation.ts` (validate each `relatedStorage` entry has a
non-empty `providerId` and de-duplicated, non-empty `volumes`; de-dupe
across entries too), and `mapRecoveryGroups.ts` (map the API's
`related_storage` array to/from the frontend `relatedStorage` shape).

**Acceptance criteria:**
- [ ] `recoveryGroupApiSchema` parses `related_storage` as an array of
      `{ provider_id_volume, volumes }`
- [ ] `validateRecoveryGroupDraft` rejects a `relatedStorage` entry with an
      empty `providerId`, empty/duplicate volume names within an entry, or
      duplicate `providerId`s across entries
- [ ] `mapRecoveryGroupApiRecord`/`toRecoveryGroupSubmitPayload`/`toRecoveryGroup`
      round-trip the array shape correctly

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-groups/api --no-coverage`
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: create a group with two `relatedStorage` entries,
      confirm the submit payload and the round-tripped read-back both
      contain both entries correctly

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Estimated scope:** Medium: 4 files

---

## Task 7: Update useRecoveryGroupRelatedVolumes for multi-provider discovery

**Description:** Replace the single `resolveDefaultFlashcopyProviderId`
lookup with resolution of the full `flashcopyProviderIds` candidate list
from the VM provider (filtered to `credentialStatus === 'ok'`). For every
selected VM, query `fetchVdisksByVm` against every candidate provider
(`useQueries` over the VM × provider cross product), and group the
resulting volume names by which provider they came from into a
`Record<providerId, string[]>` (or equivalent array), instead of the
current flat `discoveredVolumeNames: string[]`.

**Acceptance criteria:**
- [ ] Discovery runs against every linked FlashCopy provider for every
      selected VM
- [ ] Results are grouped by provider, not flattened into one list
- [ ] A VM with no volumes on a given provider contributes nothing for
      that pairing (same silent-no-op behavior as today, just per pairing)

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.ts --no-coverage`
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: none beyond the hook's own tests (covered end-to-end
      by Task 10)

**Dependencies:** Task 3, Task 6

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.ts` (new)

**Estimated scope:** Medium: 2 files

---

## Checkpoint: Model layer complete

- [ ] `npm run typecheck` passes with zero errors across the whole project
- [ ] All tests under `src/features/recovery-plans/recovery-groups/api`
      and `.../hooks` pass
- [ ] No remaining references to the old singular shape anywhere in `src/`

---

## Task 8: Update RecoveryGroupBuilder's related-storage step UI

**Description:** Replace the current single `RecoveryGroupResourcesStep`
in the related-storage step with one section per FlashCopy provider that
has any discovered or manually-added volumes. Each section shows its
provider name, its selected volumes, and lets the user add more from that
provider's inventory or remove the whole section. Auto-populate sections
from `useRecoveryGroupRelatedVolumes`'s grouped result the same way the
current single-provider version does (render-phase state sync, not
`useEffect`, to avoid the `set-state-in-effect` lint rule already hit
once in this codebase).

**Acceptance criteria:**
- [ ] A group whose selected VMs are backed by two different FlashCopy
      providers shows two separate volume sections, each pre-populated
      correctly
- [ ] Removing one section's "Clear" doesn't affect the other section
- [ ] A user can still add a volume manually to any section (or start a
      new section for a provider that had zero auto-discovered volumes)

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx --no-coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: walk through creating a group with VMs split across
      two FlashCopy providers in a running dev server, confirm both
      sections appear and submit correctly

**Dependencies:** Task 7

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`

**Estimated scope:** Medium: 1 file (concentrated complexity)

---

## Task 9: Update related-storage locale strings (en/cs/sk)

**Description:** Update/add translation keys describing the
multi-provider related-storage behavior (e.g., a per-section label, and
copy explaining volumes are grouped by storage provider). Keep exact key
parity across all three locale files.

**Acceptance criteria:**
- [ ] All new/changed keys present in `en.json`, `sk.json`, `cs.json` with
      real translations in each
- [ ] Key counts stay equal across all three files

**Verification:**
- [ ] Tests pass: N/A (verified by key-parity check)
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: diff the three locale files' key sets, confirm empty diff

**Dependencies:** Task 8 (copy depends on the final UI shape)

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Small: 3 files

---

## Task 10: Update/extend RecoveryGroupBuilder tests for multi-provider flow

**Description:** Update the existing related-storage tests in
`RecoveryGroupBuilder.test.tsx` (currently mocking a single
`useRecoveryGroupRelatedVolumes` return shape) for the new grouped-by-
provider return shape, and add a new test covering a group whose VMs
resolve volumes from two different FlashCopy providers.

**Acceptance criteria:**
- [ ] All existing related-storage tests updated and passing against the
      new shape
- [ ] A new test confirms two-provider discovery renders two sections and
      submits both correctly

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-groups --no-coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: none beyond the automated tests

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Estimated scope:** Small: 1 file

---

## Checkpoint: Feature complete

- [ ] `npm run build` (lint + typecheck + full test suite + vite build) passes
- [ ] Manual walkthrough in a running dev server: create a recovery group
      with VMs backed by two different FlashCopy providers, confirm both
      show up grouped correctly and the group saves and reloads correctly
- [ ] Commit
