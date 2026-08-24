# Implementation Plan: Recovery Application Orchestrator Submit Responses

## Overview

Update the Recovery Application submit flow so the frontend explicitly supports
both backend response modes. A local-only submit (`push_to_orchestrator=false`)
returns only `recovery_applications` and navigates back to the application list.
An orchestrated submit (`push_to_orchestrator=true`) additionally requires an
`orchestrator_push` object and keeps the user on the page until a success modal
shows the returned Airflow status, DAG path, JSON path, and DAG ID.

The recovery application builder will own the user's push choice. The value is
sent only as the `push_to_orchestrator` query parameter; it must not be added to
the request body. Existing shared form, modal, detail-row, badge, button, icon,
and toggle components will be reused.

## Confirmed Backend Contracts

### Local-only response

```json
{
  "recovery_applications": [
    {
      "id": "sample-app-recovery4",
      "policy_set_id": "test_1_hour_ps",
      "application": {},
      "airflow_run_id": "260812062710_803b0fef",
      "push_to_orchestrator": false
    }
  ]
}
```

### Orchestrated response

```json
{
  "recovery_applications": [],
  "orchestrator_push": {
    "status": "pushed",
    "dag": "/home/airflow/dags/dag_260812062852_9eb3d33e.py",
    "json": "/home/airflow/dags/dag_260812062852_9eb3d33e.json",
    "dag_id": "dag_260812062852_9eb3d33e"
  }
}
```

## Architecture Decisions

- Define separate runtime schemas and TypeScript response types for local-only
  and orchestrated submit results. Do not represent the contract only as one
  type with an optional field.
- Select the response schema from the submitted `pushToOrchestrator` value.
  When `true`, a missing or malformed `orchestrator_push` is a contract error.
- Do not infer the current submit mode from records inside
  `recovery_applications`; the returned collection may contain historical
  records with both `push_to_orchestrator=true` and `false`.
- Add `pushToOrchestrator` to the form and mutation input only. Keep the request
  body unchanged and send the value through the existing query parameter.
- Default new recovery applications to `false`. During edit, initialize the
  toggle from the selected application's `pushToOrchestrator` value.
- Require `provider_id` when `push_to_orchestrator=true`; the backend accepts a
  local-only submit without an orchestration provider, so the query parameter is
  omitted in that mode when no provider was selected.
- Extract a reusable orchestrator result modal into `src/shared/components`.
  Recovery Groups keeps a thin feature wrapper, while Recovery Applications
  supplies its four response fields through props.
- For `false`, navigate after a successful submit. For `true`, clear dirty state,
  show the modal, and navigate only when the modal is closed.

## Dependency Graph

```text
Explicit response schemas and types
  -> API parser selected by submitted mode
    -> mutation carries pushToOrchestrator
      -> builder captures push choice
        -> create/edit pages branch on response mode
          -> shared orchestrator modal displays true-mode result
```

## Task 1: Model and validate both submit response modes

**Description:** Replace the optional `orchestrator_push` response contract with
two explicit response schemas and matching TypeScript types. Parse the response
according to the request's `pushToOrchestrator` value.

**Acceptance criteria:**

- [ ] The local-only model requires `recovery_applications` and has no required
      `orchestrator_push` field.
- [ ] The orchestrated model requires `orchestrator_push.status`, `dag`, `json`,
      and `dag_id` as non-empty strings.
- [ ] A `true` submit rejects a successful HTTP response that omits or corrupts
      `orchestrator_push`; a `false` submit accepts the confirmed local response.

**Verification:**

- [ ] API tests cover both confirmed payloads and malformed true-mode payloads.
- [ ] API tests verify the exact query parameter for both boolean values.
- [ ] `npm run typecheck` passes.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/schemas/recoveryApplicationsSchema.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Estimated scope:** Medium (4 files)

## Task 2: Carry the push choice through builder state and mutation

**Description:** Add a recovery-application orchestration toggle using the shared
`Toggle` component and propagate its value from form state into the mutation.
Remove the currently hardcoded `false` from the hook.

**Acceptance criteria:**

- [ ] A new recovery application starts with `pushToOrchestrator=false`.
- [ ] The user can switch the value in the builder and the change marks the form
      dirty.
- [ ] `useSubmitRecoveryApplication` forwards the selected boolean to
      `submitRecoveryApplicationDag` without changing the JSON request body.

**Verification:**

- [ ] Builder tests cover the default and toggled states.
- [ ] Hook tests verify `false` and `true` mutation calls.
- [ ] Form mapper tests verify edit-state initialization without leaking the
      boolean into `application` request data.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.ts`
- Corresponding focused test files

**Estimated scope:** Medium (implementation plus focused tests)

## Checkpoint: Contract and submit state

- [ ] Local and orchestrated API contract tests pass.
- [ ] The body remains `{ id, policy_set_id, application }` in both modes.
- [ ] Query parameters contain the selected `provider_id` and exact boolean.
- [ ] Typecheck and lint pass.

## Task 3: Extract a shared orchestrator result modal

**Description:** Create a reusable modal composition for successful orchestrator
operations from existing shared `Modal`, `DetailRow`, `Badge`, `Button`, and
icons. It accepts translated title/description, status, detail rows, and an
optional external Airflow action. Keep Recovery Groups compatible through a
feature wrapper rather than duplicating modal markup.

**Acceptance criteria:**

- [ ] The shared component renders accessible dialog semantics, status, and an
      arbitrary list of labelled detail values.
- [ ] Monospace paths and identifiers wrap safely without overflowing.
- [ ] Recovery Group behavior and translations remain unchanged after adopting
      the shared component.

**Verification:**

- [ ] Shared modal component tests cover details, close action, and optional
      Airflow action.
- [ ] Existing Recovery Group modal/page tests continue to pass.
- [ ] Keyboard focus and close behavior match the existing shared `Modal`.

**Dependencies:** None; can be implemented after Task 1 in parallel with Task 2

**Files likely touched:**

- `src/shared/components/modal/OrchestratorResultModal.tsx`
- `src/shared/components/modal/OrchestratorResultModal.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestratorSuccessModal.tsx`
- Recovery Group modal test file

**Estimated scope:** Medium (4 files)

## Task 4: Integrate true/false behavior into Create Recovery Application

**Description:** Use the mutation result in the create page. Local-only success
navigates immediately. Orchestrated success stores `orchestrator_push`, opens a
Recovery Application wrapper around the shared modal, and navigates only after
the user closes it.

**Acceptance criteria:**

- [ ] A false-mode success never opens the orchestrator modal and returns to the
      recovery application list.
- [ ] A true-mode success displays `status`, `dag`, `json`, and `dag_id` exactly
      as returned by the backend.
- [ ] Dirty-state protection is cleared after success, while submit/contract
      failure keeps the populated builder visible and shows the existing error.

**Verification:**

- [ ] Page tests cover both navigation branches.
- [ ] Page test confirms no navigation before closing a true-mode modal.
- [ ] Modal test asserts all four backend values are visible.

**Dependencies:** Tasks 1, 2, and 3

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.tsx`
- Its focused test file

**Estimated scope:** Medium (4 files)

## Task 5: Apply the same behavior to Edit Recovery Application

**Description:** Initialize the edit toggle from GET data and reuse the exact
same submit-result branch and success modal as Create.

**Acceptance criteria:**

- [ ] Edit reflects the selected application's current
      `push_to_orchestrator` value.
- [ ] False-mode edit returns directly to the list after success.
- [ ] True-mode edit shows the same orchestrator response modal and returns only
      after it is closed.

**Verification:**

- [ ] Mapper and editor tests cover initial `true` and `false` values.
- [ ] Editor page tests cover both submit outcomes.
- [ ] Existing unsaved-change guard tests remain green.

**Dependencies:** Tasks 1–4

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 6: Add translations and complete verification

**Description:** Add localized Recovery Application labels for the toggle and
success modal, then run focused and repository-level quality checks.

**Acceptance criteria:**

- [ ] EN, SK, and CS contain equivalent labels for deployment choice, status,
      DAG path, JSON path, DAG ID, close, and Airflow action.
- [ ] No Recovery Group-specific wording appears in the Recovery Application
      modal.
- [ ] No untranslated keys are visible in either submit mode.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Focused Recovery Application and shared modal tests pass.
- [ ] Recovery Group regression tests pass.
- [ ] `npm run test` and `vite build` pass; if the full suite exceeds the local
      timeout, record that separately without hiding focused-test results.
- [ ] Manual check: submit once with each mode and verify navigation/modal flow.

**Dependencies:** Tasks 1–5

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`
- Focused tests listed above

**Estimated scope:** Medium (locales plus verification)

## Checkpoint: Complete

- [ ] Both backend response modes are explicitly typed and runtime-validated.
- [ ] `push_to_orchestrator` is user-controlled and remains a query parameter.
- [ ] False mode navigates directly; true mode displays all orchestrator fields.
- [ ] Create and Edit behave consistently.
- [ ] Recovery Group modal behavior has no regression.
- [ ] Relevant tests, lint, typecheck, and production build pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Historical rows contain mixed push flags | Current submit mode could be inferred incorrectly | Branch only on the submitted boolean and top-level `orchestrator_push` |
| Backend returns HTTP 200 but omits true-mode details | Empty or misleading success modal | Parse with the strict true-mode schema and surface a submit error |
| Shared modal extraction changes Recovery Group UX | Regression in an existing flow | Preserve a Recovery Group wrapper and run its existing tests |
| Long DAG/JSON paths overflow the dialog | Broken responsive layout | Use wrapping monospace detail values and test long paths |
| Edit GET has no orchestration provider ID | Existing pushed app cannot restore provider selection | Keep provider selection explicitly required for resubmit; do not infer it from unrelated fields |

## Open Questions

None required before implementation. The provided payloads and existing
Recovery Group pattern define the necessary behavior.
