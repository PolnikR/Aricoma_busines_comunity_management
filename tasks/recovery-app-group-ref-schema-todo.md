## Task 1: Align `RecoveryGroup`/`RecoveryTier` types to the generated contract and drop the unsafe cast

**Description:** Add the required `id` field to the frontend `RecoveryGroup` type in `recoveryApplicationTypes.ts`, and remove the `as Parameters<typeof submitRecoveryDagSubmitRecoveryDagPost>[0]` cast in `recoveryApplicationsApi.ts` so `RecoveryApplicationData` must structurally satisfy the generated `RecoveryAppSubmission` input type.

**Acceptance criteria:**
- [ ] `RecoveryGroup` interface includes `id: string`
- [ ] `submitRecoveryApplicationDag` calls `submitRecoveryDagSubmitRecoveryDagPost` without an `as` cast on the request body
- [ ] `npx tsc --noEmit` passes (or reveals only the known `id`-related gaps addressed in Task 3, not new unrelated errors)

**Verification:**
- [ ] Typecheck: `npx tsc --noEmit`
- [ ] Manual check: confirm no other `as Parameters<...>` casts remain around this call

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 2: Preserve `recovery_group.id` when mapping GET responses

**Description:** `mapRecoveryTier` in `mapRecoveryApplications.ts` currently drops `id` when converting an API `RecoveryTierOutput` into the frontend `RecoveryTier` model, so re-editing and resubmitting an existing application would hit the same 422. Add `id` to the mapped `recovery_group`.

**Acceptance criteria:**
- [ ] `mapRecoveryTier` includes `id: tier.recovery_group.id` in its output
- [ ] Loading an existing recovery application for edit and resubmitting it without changes does not 422

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
- [ ] Typecheck: `npx tsc --noEmit`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.ts`

**Estimated scope:** Small: 1 file

---

## Task 3: Fix `RecoveryAppBuilder.tsx` group-attach and group-lookup logic

**Description:** `handleRecoveryGroupAdded` currently sets `recovery_group.name = selectedGroup.id` and never sets `id`. Fix it to set `id: selectedGroup.id, name: selectedGroup.name`. `handleRecoveryVmSelectionChange` looks up the selected group via `availableGroups.find(group => group.id === tier.recovery_group?.name)` — since `name` will now hold the real display name, switch this lookup to key off `tier.recovery_group?.id`.

**Acceptance criteria:**
- [ ] Attaching a recovery group to a tier sets both `id` and `name` correctly on `recovery_group`
- [ ] VM selection changes on a tier with an attached group still resolve the correct group after the lookup key change
- [ ] `TierCard`/`TierCanvas` labels display the group's human-readable name (not its slug id) after this change

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- [ ] Manual check: in the running app, create a recovery application, attach a recovery group to a tier, toggle VM selection, and submit — confirm no 422 and correct group name display

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`

**Estimated scope:** Small: 1 file

---

## Task 4: Update test fixtures and add regression coverage

**Description:** Update existing test fixtures that construct `recovery_group` objects without `id` (these will now fail type/schema checks), and add explicit coverage asserting the submission payload includes `recovery_group.id`.

**Acceptance criteria:**
- [ ] All fixtures in `recoveryApplicationsApi.test.ts` that build `recovery_group` mock data include `id`
- [ ] `recoveryApplicationFormMapper.test.ts` covers `toRecoveryApplicationData` producing a `recovery_group` with both `id` and `name`, validated against the generated `RecoveryAppSubmission`/`RecoveryTier` zod schema
- [ ] `RecoveryAppBuilder.test.tsx` covers: adding a recovery group to a tier results in a submitted payload containing the group's `id`

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Dependencies:** Tasks 1, 2, 3

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Medium: 3 files

---

## Checkpoint: Complete
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` on all four touched test files passes
- [ ] Manual verification: submitting a recovery application with an attached recovery group succeeds (no 422)
- [ ] No complete-suite/full-build run performed unless explicitly requested (per focused-verification policy)
