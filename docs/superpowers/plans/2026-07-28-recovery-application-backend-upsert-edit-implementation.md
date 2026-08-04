# Implementation Plan: Recovery Application Backend Upsert Editing

## Overview

Restore recovery application editing without reintroducing mock persistence.
Applications remain sourced from `GET /api/get_recovery_apps`; both creation
and editing submit through `POST /api/submit_recovery_dag` with `is_final=false`. The backend decides whether
the operation updates an existing file or creates a new file from the submitted
filename.

## Architecture Decisions

- Reuse `RecoveryAppBuilder` for create and edit through `initialData`.
- Select the edited application from the existing backend list by its `file`
  identifier, mapped to `RecoveryApplicationListItem.id`.
- Submit the dedicated filename field. Edit keeps it disabled and does not
  rename or delete files in the frontend.
- Validate editable tier data at the API boundary before it reaches the builder.
- Restore Edit only. Do not restore the removed mock-backed Delete action.

## Task 1: Validate and map editable recovery data

**Description:** Strengthen the recovery application response schema for the
backend's optional nested `recovery_group` tier contract and preserve the same
shape in `RecoveryApplicationFormState`.

**Acceptance criteria:**

- [ ] Tier `order` and `description` are required; nested recovery-group fields and VM names are validated when present.
- [ ] Valid backend data maps to a form state containing a `Map` of tiers.
- [ ] Invalid editable tier data fails at the API boundary instead of reaching UI code.

**Verification:**

- [ ] API tests cover valid tier parsing.
- [ ] API tests cover rejection of invalid tier records.
- [ ] Mapper tests verify metadata and VM preservation.

**Dependencies:** None.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`

**Estimated scope:** Medium, 5 files.

## Task 2: Restore the backend-backed editor page

**Description:** Add a dedicated editor page that reads the route file ID,
loads the existing backend list, selects the matching item, initializes
`RecoveryAppBuilder`, and submits the edited data through the existing DAG
mutation.

**Acceptance criteria:**

- [ ] A matching backend application opens with all editable fields prefilled.
- [ ] Save submits exactly once using the dedicated `fileName`.
- [ ] Successful submission navigates to the recovery application list.
- [ ] Loading, fetch error, not-found, saving, and submit-error states are handled.

**Verification:**

- [ ] Page tests cover loading, error, and not-found states.
- [ ] Page test verifies unchanged name submission.
- [ ] Page test verifies changed name submission.
- [ ] Submit failure keeps the editor visible and displays the error.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.ts`

**Estimated scope:** Medium, 3 files.

## Task 3: Restore edit navigation

**Description:** Restore the editor route and expose an Edit action from the
recovery detail drawer. Route navigation must preserve backend file identifiers
containing spaces or other URL-sensitive characters.

**Acceptance criteria:**

- [ ] The detail drawer displays Edit and does not display Delete.
- [ ] Edit navigates to the selected backend file's editor route.
- [ ] The route safely handles encoded file identifiers.
- [ ] Direct navigation to the edit route renders the editor page.

**Verification:**

- [ ] Table test verifies Edit dispatches the selected file ID.
- [ ] List page or router test verifies the encoded edit URL.
- [ ] Existing JSON viewer behavior remains unchanged.

**Dependencies:** Task 2.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- `src/app/router.tsx`

**Estimated scope:** Medium, 4 files.

## Checkpoint: Backend upsert edit flow

- [ ] Recovery list loads only through `GET /api/get_recovery_apps`.
- [ ] Create and edit submit only through `POST /api/submit_recovery_dag` with `is_final=false`.
- [ ] Unchanged filename is passed unchanged.
- [ ] Changed filename is passed as entered.
- [ ] No `/api/recovery-applications`, local storage, or MSW recovery handler is restored.

## Task 4: Regression and quality verification

**Description:** Run the focused tests and full project quality gates, then
inspect the final diff for stale mock references and unintended dependency
changes.

**Acceptance criteria:**

- [ ] No current recovery mock data or mock CRUD reference exists.
- [ ] MSW dependency and `public/mockServiceWorker.js` remain available.
- [ ] Existing provider backend flow is unaffected.
- [ ] All project quality commands pass.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Search for `mockRecoveryApplications`, `/api/recovery-applications`,
      `setupWorker`, and `worker.start` returns no active runtime recovery flow.

**Dependencies:** Tasks 1–3.

**Files likely touched:**

- Only files requiring corrections found by verification.

**Estimated scope:** Small.

## Final Checkpoint

- [ ] Edit route works from the recovery application drawer.
- [ ] Existing backend application data pre-fills the builder.
- [ ] Save delegates update-versus-create behavior entirely to `submit_recovery_dag`.
- [ ] Errors do not discard the user's current edit.
- [ ] Tests, lint, typecheck, and production build pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Backend `file` contains URL-sensitive characters | Medium | Encode the ID during navigation and use the decoded route parameter for lookup |
| Tier payload differs from builder shape | High | Validate tier structure with Zod and test representative backend payloads |
| Async data causes builder to initialize empty | High | Render the builder only after the selected backend item is available |
| Rename is mistaken for frontend update logic | Medium | Always submit current filename and leave upsert semantics exclusively to backend |
| Mock CRUD is accidentally restored | High | Regression search and endpoint assertions in tests |

## Open Questions

None. The backend upsert behavior and selected implementation approach are approved.
