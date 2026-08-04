# Implementation Plan: Submit DAG Provider ID

## Overview

Extend the recovery-application submit path so the selected Airflow provider is
sent as the backend's required `provider_id` query parameter.

## Architecture Decisions

- Reuse `RecoveryApplicationFormState.platform`, which already contains and
  validates the selected Airflow provider ID.
- Add an explicit required `providerId` to the mutation contract instead of
  coupling the API client to `data.application.platform`.
- Preserve the existing JSON request body and platform field.
- Validate again at the API boundary before any network call.

## Dependency Graph

```text
API contract tests
      |
Submit type and API client
      |
Mutation hook
      |
Create and edit pages
      |
Full verification
```

## Task 1: Define the required API contract

**Description:** Update API-level tests first so they require an encoded,
non-empty `provider_id` and prove the old implementation fails.

**Acceptance criteria:**

- [ ] Normal and final request URLs include `provider_id`.
- [ ] Empty provider IDs fail before `fetch`.

**Verification:**

- [ ] Focused API test fails for the expected missing contract.
- [ ] Focused API test passes after implementation.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`

**Estimated scope:** S

## Task 2: Propagate provider ID through the submit flow

**Description:** Make `providerId` required in the mutation input and pass the
selected `formState.platform` from both create and edit pages.

**Acceptance criteria:**

- [ ] The mutation input requires `providerId`.
- [ ] Create and edit submissions pass the selected platform provider ID.
- [ ] The hook forwards the ID to the API client.

**Verification:**

- [ ] Hook and page tests fail before implementation for the expected reason.
- [ ] Hook and page tests pass after implementation.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- focused page tests

**Estimated scope:** M, split into hook and page checkpoints.

## Checkpoint: Contract and propagation

- [ ] All focused recovery-application submit tests pass.
- [ ] No submit call site omits `providerId`.

## Task 3: Production verification

**Description:** Verify repository-wide compatibility and review the complete
diff for contract, security, and scope correctness.

**Acceptance criteria:**

- [ ] Lint, typecheck, full tests, and production build pass.
- [ ] No unrelated files or request-body changes are present.

**Verification:**

- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] Review all `submitRecoveryApplicationDag` call sites.

**Dependencies:** Tasks 1 and 2

**Files likely touched:** None beyond focused fixes.

**Estimated scope:** S

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Provider ID omitted by one call site | High | Required type plus repository-wide call-site search |
| Empty ID reaches backend | Medium | API-boundary trim and pre-fetch validation |
| Existing JSON contract changes accidentally | Medium | Keep mapper untouched and assert request body |
| Editor resubmits legacy unavailable provider | Medium | Existing builder validation blocks unavailable IDs |

## Open Questions

None. The existing Platform Provider select is the approved source of
`provider_id`.

