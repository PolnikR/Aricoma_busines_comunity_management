# Implementation Plan: Recovery DAG `is_final`

## Overview

Rename the recovery submit endpoint to `submit_recovery_dag`, add a typed
`isFinal` function parameter defaulting to `false`, and explicitly submit
`is_final=false` from the shared recovery mutation.

## Task 1: Update the API contract

**Description:** Change the submit function signature and construct the new
endpoint URL with `URLSearchParams`.

**Acceptance criteria:**

- [ ] Endpoint is `/api/submit_recovery_dag`.
- [ ] `filename` and `is_final` are query parameters.
- [ ] `isFinal` defaults to `false`.
- [ ] Request body, headers, response parsing, and error handling remain intact.

**Verification:**

- [ ] API test covers default `false`.
- [ ] API test covers explicit `true`.
- [ ] API test verifies encoded filenames.

**Dependencies:** None.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Estimated scope:** Small.

## Task 2: Pass the current application policy

**Description:** Update the shared recovery submit hook to pass `false`
explicitly, so Create and Edit use the same non-final policy.

**Acceptance criteria:**

- [ ] `useSubmitRecoveryApplication` passes `false`.
- [ ] Create and Edit continue using the shared hook.
- [ ] No UI toggle is introduced.

**Verification:**

- [ ] Hook test expects the new URL with `is_final=false`.
- [ ] Existing query invalidation behavior remains covered.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.test.tsx`

**Estimated scope:** Small.

## Task 3: Update references and verify

**Description:** Replace current-code and current-design references to the
removed endpoint, then run project quality gates.

**Acceptance criteria:**

- [ ] Current comments and docs reference `submit_recovery_dag`.
- [ ] Historical documents remain unchanged unless they describe current behavior.
- [ ] No runtime reference to `/api/submit_dag` remains.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Search confirms `is_final=false` is present in the shared submit flow.

**Dependencies:** Tasks 1–2.

**Files likely touched:**

- `docs/superpowers/specs/2026-07-28-recovery-application-backend-upsert-edit-design.md`
- `docs/superpowers/plans/2026-07-28-recovery-application-backend-upsert-edit-implementation.md`

**Estimated scope:** Small.

## Final Checkpoint

- [ ] Create submits with `is_final=false`.
- [ ] Edit submits with `is_final=false`.
- [ ] Explicit `isFinal=true` is supported by the API function for the later switch.
- [ ] Request payload and `X-User` behavior are unchanged.
- [ ] Quality gates pass.

## Open Questions

None.
