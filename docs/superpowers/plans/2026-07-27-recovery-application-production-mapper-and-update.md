# Implementation Plan: Recovery Application Production Mapper and Update

## Overview

Create one canonical mapping boundary from `RecoveryApplicationFormState` to
the backend JSON contract. Both Create and Update will use this mapper so page
components cannot produce different payloads. Remove `provider_id` from the
backend payload while leaving the current tier structure unchanged.

Prepare Update for production by using the real API mutation, validating
request/response behavior, preserving the builder on failure, and updating the
React Query cache only after success.

## Target Data Flow

```text
RecoveryAppBuilder
  -> RecoveryApplicationFormState
  -> mapRecoveryApplicationFormToData()
  -> RecoveryApplicationData
  -> create/update React Query mutation
  -> recoveryApplicationApi
  -> real backend
```

## Architecture Decisions

- `RecoveryApplicationFormState` remains the UI model and may retain UI-only
  fields.
- `RecoveryApplicationData` becomes the exact backend DTO and does not contain
  `provider_id`.
- Tier structure remains unchanged, including `name`, `order`, `description`,
  and `vms`.
- Create and Update must never construct `applicationData` independently.
- The mapper is pure, feature-owned, and unit tested with exact deep equality.
- Failed Update keeps the current builder mounted and unchanged.
- Successful Update invalidates both the detail and list query.

## Task 1: Separate the Form Model from the Backend DTO

**Description:** Adjust recovery application types so the backend payload
matches the required JSON and does not expose `provider_id`.

**Acceptance criteria:**

- [ ] `RecoveryApplicationData.application` contains only `name`,
      `description`, `environment`, `platform`, `source_connection`,
      `target_connection`, and `tiers`.
- [ ] `provider_id` is absent from the backend DTO.
- [ ] Tier types and serialized tier fields remain unchanged.
- [ ] UI-only state does not leak into backend types.

**Verification:**

- [ ] Typecheck reports every remaining producer/consumer that assumes
      `provider_id`.
- [ ] `rg "provider_id" src/features/recovery-plans/recovery-applications`
      returns no backend payload usage.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`

**Estimated scope:** Small (1 file)

## Task 2: Add the Canonical Form-to-DTO Mapper

**Description:** Implement one pure mapper that converts metadata and the tier
`Map` into the exact backend JSON structure.

**Acceptance criteria:**

- [ ] Mapper converts `Map<string, RecoveryTier>` to
      `Record<string, RecoveryTier>`.
- [ ] Output contains no `provider_id`.
- [ ] Output preserves custom tiers, tier order values, descriptions, names,
      and VM arrays.
- [ ] Mapper does not mutate form state, tiers, or VM arrays.
- [ ] Unit test compares the complete output with the required JSON contract.

**Verification:**

- [ ] Mapper unit tests pass.
- [ ] Mutation of mapped output cannot mutate the source form state.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/mapRecoveryApplicationFormToData.ts`
- `src/features/recovery-plans/recovery-applications/model/mapRecoveryApplicationFormToData.test.ts`

**Estimated scope:** Small (2 files)

## Checkpoint: Contract Foundation

- [ ] Exact target JSON test passes.
- [ ] Typecheck passes for the mapper and model.
- [ ] Tier JSON is unchanged.

## Task 3: Migrate Create to the Mapper and Real Mutation

**Description:** Remove inline JSON construction and direct `localStorage`
persistence from the create page. Map the form once and call the existing
create mutation.

**Acceptance criteria:**

- [ ] Create page calls the canonical mapper.
- [ ] Create page contains no `localStorage` or JSON serialization.
- [ ] Navigation occurs only after `mutateAsync` resolves.
- [ ] Failed creation leaves all builder values and VMs intact.
- [ ] Pending mutation disables the Save button.

**Verification:**

- [ ] Page test verifies mapper/mutation payload and success navigation.
- [ ] Page test verifies no navigation after a rejected mutation.

**Dependencies:** Task 2 and confirmed production create endpoint

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`

**Estimated scope:** Small (2 files)

## Task 4: Migrate Update to the Mapper

**Description:** Replace duplicated inline payload construction in the editor
with the canonical mapper and harden the production mutation flow.

**Acceptance criteria:**

- [ ] Update sends the same DTO shape as Create.
- [ ] Update request contains no `provider_id`.
- [ ] Application ID is URL encoded in the API client.
- [ ] Successful update navigates only after the backend response.
- [ ] Failed update preserves metadata, tiers, and selected VMs.
- [ ] Mutation error remains visible and retry is possible.

**Verification:**

- [ ] Editor page test covers successful Update.
- [ ] Editor page test covers failed Update without navigation or state loss.
- [ ] API test verifies method, encoded URL, headers, and exact JSON body.

**Dependencies:** Task 2 and confirmed production update endpoint

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Estimated scope:** Medium (4 files)

## Task 5: Harden React Query Cache Behavior

**Description:** Verify that successful Update refreshes both detail and list
consumers without introducing cache changes on failure.

**Acceptance criteria:**

- [ ] Success invalidates `recoveryApplicationQueryKey(id)`.
- [ ] Success invalidates `recoveryApplicationsQueryKey`.
- [ ] Failure does not invalidate successful cached data.
- [ ] Empty ID never triggers a detail request.

**Verification:**

- [ ] Hook tests cover success and rejection paths.

**Dependencies:** Task 4

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/api/useRecoveryApplications.test.tsx`

**Estimated scope:** Small (2 files)

## Task 6: Remove Temporary Recovery Persistence and Mock Interception

**Description:** Remove Recovery Applications `localStorage` and MSW paths so
development and production both call the real backend. Do not remove mock
infrastructure used by unrelated features without checking consumers.

**Acceptance criteria:**

- [ ] No Recovery Applications code reads or writes
      `mockRecoveryApplications`.
- [ ] Development does not intercept `/api/recovery-applications`.
- [ ] Backend/network errors reach React Query and the existing error UI.
- [ ] No silent fallback converts a backend failure into an empty list.

**Verification:**

- [ ] `rg "mockRecoveryApplications" src` returns no recovery persistence.
- [ ] `rg "recovery-applications" src/mocks` returns no handlers.
- [ ] Manual GET reaches backend `/recovery-applications` through the Vite
      `/api` proxy.

**Dependencies:** Confirmed real endpoint contracts

**Files likely touched:**

- `src/mocks/handlers.ts`
- `src/mocks/data.ts`
- `src/mocks/browser.ts`
- `src/main.tsx`
- `package.json`
- `package-lock.json`

**Estimated scope:** Medium (up to 6 files; delete MSW package only if unused)

## Final Checkpoint

- [ ] Exact mapper JSON matches the required payload.
- [ ] Create and Update use the same mapper.
- [ ] No payload contains `provider_id`.
- [ ] No Recovery Applications persistence uses `localStorage` or MSW.
- [ ] Failed Create/Update preserves builder state.
- [ ] Focused recovery tests pass.
- [ ] Full lint, typecheck, test suite, and production build pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Create and Update drift again | High | Pages import one mapper; exact payload test owns the contract. |
| Backend Update method/path differs | High | Confirm the endpoint before changing API code. |
| Removing `provider_id` breaks response parsing | Medium | Update DTO and fixtures together; test real response contract. |
| MSW still intercepts real requests in development | High | Remove recovery handlers and verify request in browser Network panel. |
| Failed mutation clears builder | High | Await mutation before navigation; test rejection path. |

## Required Endpoint Confirmation

The list endpoint is confirmed:

```text
GET /recovery-applications
```

Before implementation, confirm the production contracts for:

```text
POST   /recovery-applications
GET    /recovery-applications/{id}
PUT or PATCH /recovery-applications/{id}
DELETE /recovery-applications/{id}
```
