# Implementation Plan: Recovery Application Filename

## Overview

Separate backend file identity from `application.name`. Add a validated filename
base to the recovery form, keep it editable during Create and disabled during
Edit, and pass it independently to the shared submit mutation.

## Task 1: Add filename to form state and mapping

**Description:** Extend the form model with `fileName` and map backend `file`
identifiers into editable form state without including filename in the JSON body.

**Acceptance criteria:**

- [ ] `RecoveryApplicationFormState` requires `fileName`.
- [ ] Edit mapping strips one terminal case-insensitive `.json`.
- [ ] JSON mapping excludes `fileName`.
- [ ] Create defaults filename to an empty string.

**Verification:**

- [ ] Mapper tests cover `.json` stripping.
- [ ] Mapper test confirms filename is absent from request JSON.

**Dependencies:** None.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`

**Estimated scope:** Medium.

## Task 2: Add and validate the filename input

**Description:** Add a separate filename field to metadata UI with programmer
identifier validation and disabled support.

**Acceptance criteria:**

- [ ] Input accepts `^[A-Za-z][A-Za-z0-9_]*$`.
- [ ] Invalid or empty filename blocks Save.
- [ ] Value is never silently rewritten and `.json` is not appended.
- [ ] Edit mode disables the input.

**Verification:**

- [ ] Metadata tests cover value propagation and disabled state.
- [ ] Builder tests cover accepted and rejected filenames.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Medium.

## Task 3: Submit filename independently

**Description:** Change the shared mutation input to carry `fileName` alongside
`RecoveryApplicationData`, then update Create and Edit callers.

**Acceptance criteria:**

- [ ] Hook calls `submitRecoveryApplicationDag(fileName, data, false)`.
- [ ] Create submits the enabled input value.
- [ ] Edit submits the disabled backend-derived value.
- [ ] `application.name` remains only in the JSON body.

**Verification:**

- [ ] Hook test uses different filename and application name values.
- [ ] Create and Edit page tests verify independent values.
- [ ] Existing query invalidation remains covered.

**Dependencies:** Tasks 1–2.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`

**Estimated scope:** Medium.

## Task 4: Verify the full flow

**Description:** Run focused and full quality checks and confirm no caller still
derives filename from application name.

**Acceptance criteria:**

- [ ] No submit caller uses `data.application.name` as filename.
- [ ] Create filename is enabled; Edit filename is disabled.
- [ ] Both flows send `is_final=false`.
- [ ] No mock persistence returns.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Search for `submitRecoveryApplicationDag(data.application.name` returns no result.

**Dependencies:** Tasks 1–3.

**Files likely touched:**

- Only files requiring verification corrections.

**Estimated scope:** Small.

## Final Checkpoint

- [ ] `Test App` may remain the application name.
- [ ] A separate value such as `test_app` is sent as `filename`.
- [ ] Backend adds `.json`; frontend does not.
- [ ] Edit cannot rename the backing file.
- [ ] Quality gates pass.

## Open Questions

None.
