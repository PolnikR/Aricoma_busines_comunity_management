# Implementation Plan: Required Tier and Recovery Group Fields

## Overview

Separate tier description from recovery-group description and require ID, tier
description, recovery-group name, and recovery-group description in both tier
Create and Edit flows.

## Task 1: Update tier creation

**Description:** Replace the ambiguous tier creation fields with four required
inputs and construct the exact backend tier shape.

**Acceptance criteria:**

- [ ] Inputs are ID, Tier description, Recovery group name, and Recovery group description.
- [ ] Create remains disabled until all fields are non-empty after trimming.
- [ ] Tier and group descriptions map independently.
- [ ] New recovery group starts with an empty VM list.

**Verification:**

- [ ] AddTierCard tests cover the disabled state for every missing field.
- [ ] Creation test asserts the exact backend-shaped tier.

**Dependencies:** None.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/AddTierCard.tsx`
- `src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx`

**Estimated scope:** Small.

## Task 2: Update tier editing

**Description:** Track and validate both descriptions independently in the Edit
form and pass the complete update through the tier callback.

**Acceptance criteria:**

- [ ] Edit shows four required fields.
- [ ] Each empty field displays its own error and blocks confirmation.
- [ ] Existing group values populate their matching fields.
- [ ] Editing a tier without a group starts group fields empty.

**Verification:**

- [ ] TierCard tests cover initial values and each required validation.
- [ ] Save callback test includes both descriptions.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/TierCard.tsx`
- `src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx`

**Estimated scope:** Medium.

## Task 3: Preserve the full update through the builder

**Description:** Update TierCanvas and RecoveryAppBuilder callback contracts so
the correct values reach the recovery model without overwriting each other.

**Acceptance criteria:**

- [ ] Tier description updates only `tier.description`.
- [ ] Group description updates only `tier.recovery_group.description`.
- [ ] Group name updates only `tier.recovery_group.name`.
- [ ] Existing recovery-group VM assignments are preserved.

**Verification:**

- [ ] TierCanvas callback types compile.
- [ ] Builder test verifies independent descriptions and preserved VMs.

**Dependencies:** Task 2.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx`
- `src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Medium.

## Task 4: Verify

**Description:** Run quality checks and ensure no fallback copies tier
description into group description.

**Acceptance criteria:**

- [ ] No optional labels remain in tier Create/Edit.
- [ ] No description fallback remains in tier update logic.
- [ ] GET compatibility for absent recovery groups remains.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `git diff --check`

**Dependencies:** Tasks 1–3.

**Files likely touched:**

- Only files requiring verification corrections.

**Estimated scope:** Small.

## Final Checkpoint

- [ ] All four tier form fields are required.
- [ ] Submitted tier JSON contains distinct tier and group descriptions.
- [ ] VM assignments survive tier edits.
- [ ] Quality gates pass.

## Open Questions

None.
