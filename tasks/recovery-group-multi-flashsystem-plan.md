# Implementation Plan: Multiple FlashCopy Providers per Recovery Group

## Overview

Today a compute provider (VMware/IBM Power) can point at exactly one
FlashCopy (FlashSystem) provider (`ProviderRecord.defaultFlashcopyProviderId`),
and a recovery group can reference exactly one FlashCopy provider
(`RecoveryGroup.relatedVolumeProviderId` + a flat `relatedVolumes: string[]`).
In practice, VMs behind a single VMware/Power provider can be backed by
**more than one** physical FlashSystem array (different datastores on
different arrays). The current one-provider ceiling means volumes on any
array other than the default are silently undiscoverable and unattachable.

Fixing this requires changing the backend API contract in two places (a
provider can expose more than one FlashCopy provider; a recovery group can
record more than one provider+volumes pairing) before the frontend can do
anything with it. **This session has no backend access**, so Phase 0 below
is a specification handoff, not code — everything in Phase 1+ is blocked
until Phase 0 ships.

## Architecture Decisions

- **Provider model**: replace the singular `defaultFlashcopyProviderId:
  string | null` with a `flashcopyProviderIds: string[]` (empty array =
  none configured). This is the minimal shape change that unblocks
  discovery across multiple candidate arrays without redesigning the
  provider resource itself.
- **Recovery group model**: replace the singular `relatedVolumeProviderId`
  + flat `relatedVolumes: string[]` with a `relatedStorage: {
  providerId: string; volumes: string[] }[]` — one entry per FlashCopy
  provider that actually contributes volumes to the group. This mirrors
  the shape change needed on the wire (`provider_id_volume` + `volumes`
  singular → `related_storage: [{ provider_id_volume, volumes }]` array).
- **Discovery stays per-VM, but fans out across all candidates**:
  `useRecoveryGroupRelatedVolumes` currently resolves one FlashCopy
  provider and calls `fetchVdisksByVm` once per selected VM. The updated
  version queries `fetchVdisksByVm` for every selected VM against every
  candidate provider in `flashcopyProviderIds`, and groups whatever comes
  back by which provider it actually came from — a VM with no volumes on
  a given array simply contributes nothing for that pairing, same
  no-error-no-op behavior as today, just repeated per candidate.
- **UI groups volumes by provider**: the Related Storage step shows one
  section per FlashCopy provider with any discovered or manually-added
  volumes (instead of one flat list), so it stays legible when a group
  spans more than one array.
- **No speculative frontend work ahead of the backend contract**: Phase 1+
  tasks are written now so they're ready to execute, but none of them
  start until Phase 0's schema exists and returns real data — building
  the array-shaped UI against a backend that still returns the old
  singular shape would be untestable and would violate the "don't build
  for hypothetical capability" rule.

## Task List

### Phase 0: Backend API contract (handoff spec — not implementable this session)

- [ ] Task 1: Specify and request the provider API change
      (`defaultFlashcopyProviderId` → `flashcopyProviderIds: string[]`)
- [ ] Task 2: Specify and request the recovery group API change
      (`provider_id_volume`/`volumes` → `related_storage: [{ provider_id_volume, volumes }]`)

### Checkpoint: Backend contract confirmed
- [ ] Backend team has agreed to and shipped both schema changes (or
      confirmed a target date)
- [ ] A real (or staging) `/providers` response has been seen returning
      `flashcopyProviderIds` as an array
- [ ] A real (or staging) recovery-groups response/submit contract has
      been seen using `related_storage` as an array
- [ ] **Do not start Phase 1 until this checkpoint is met** — there is
      nothing to build or test against otherwise

### Phase 1: Frontend — provider model

- [ ] Task 3: Update `ProviderRecord`/`providersSchema` to
      `flashcopyProviderIds: string[]`
- [ ] Task 4: Update `VirtualMachineDetailPanel` (the other existing
      consumer of `defaultFlashcopyProviderId`) to fan out across all
      candidates instead of assuming one

### Phase 2: Frontend — recovery group model, validation, mapping

- [ ] Task 5: Update `RecoveryGroup`/`RecoveryGroupDraft` to
      `relatedStorage: { providerId: string; volumes: string[] }[]`
- [ ] Task 6: Update `recoveryGroupsSchema.ts`, `recoveryGroupsValidation.ts`,
      and `mapRecoveryGroups.ts` for the new array shape
- [ ] Task 7: Update `useRecoveryGroupRelatedVolumes` to discover across
      all candidate FlashCopy providers and group results by provider

### Checkpoint: Model layer complete
- [ ] `npm run typecheck` passes with the new shapes
- [ ] Existing non-UI tests for the touched files updated and passing

### Phase 3: Frontend — Related Storage step UI

- [ ] Task 8: Update `RecoveryGroupBuilder`'s related-storage step to
      render one section per FlashCopy provider with volumes, allow
      adding a volume from any connected FlashCopy provider, and allow
      removing a whole provider section
- [ ] Task 9: Update related-storage locale strings (en/cs/sk) to reflect
      multi-provider behavior
- [ ] Task 10: Update/extend `RecoveryGroupBuilder.test.tsx` for the
      multi-provider related-storage flow

### Checkpoint: Feature complete
- [ ] `npm run build` (lint + typecheck + full test suite + vite build)
      passes
- [ ] Manual check: a recovery group with VMs split across two FlashCopy
      providers shows volumes grouped correctly and submits successfully
- [ ] Commit

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend team scopes this differently (e.g., resolves the array server-side and still returns one merged list) | High — Phase 1+ tasks would need rework | Task 1/2 should be a real conversation with whoever owns the API, not just this document; confirm the actual shape before starting Phase 1 |
| Discovery cost grows from N VMs × 1 provider to N VMs × M providers | Medium — more requests, slower related-storage step | Keep the "batched on step entry" behavior (only fires when the user reaches that step); consider capping to providers with `credentialStatus: 'ok'` only (already planned) |
| Existing recovery groups saved under the old singular schema need a migration path | Medium | Confirm with backend whether existing data gets migrated server-side or whether the frontend needs to read both shapes during a transition window |

## Open Questions

- Who owns the backend/API for this system, and has Task 1/2's request
  actually been sent to them yet? (Out of reach for this session — no
  backend access.)
- Should discovery search *all* connected FlashCopy providers, or only
  ones explicitly linked to the VM provider via `flashcopyProviderIds`?
  This plan assumes the latter (explicit linking), matching the direction
  already confirmed.
- Is there a migration concern for recovery groups already saved under the
  current singular `provider_id_volume`/`volumes` shape?
