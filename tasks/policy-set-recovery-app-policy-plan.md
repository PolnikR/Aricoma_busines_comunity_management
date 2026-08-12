# Implementation Plan: Recovery application policy in Policy Sets

## Overview

Update Policy Sets to the new backend contract so every set contains snapshot policy IDs and exactly one recovery application policy ID. The Policy Set form will continue to load snapshot policies through the existing snapshot-policy hook and will load recovery application policies through the existing `useRecoveryAppPolicies` hook, sharing the React Query cache instead of introducing another API client or cache key. Create, edit, list, and detail views must preserve and expose both associations.

## Confirmed scope

- New wire contract:

  ```json
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "snapshot_policy_ids": [],
    "recovery_app_policy_id": "string"
  }
  ```

- Normalize the frontend model to `snapshotPolicyIds` and `recoveryAppPolicyId`.
- Keep the existing snapshot-policy selection behavior; this change does not redesign it.
- Add one single-choice Recovery App Policy selector to create and edit forms.
- Reuse existing hooks, query keys, API functions, and shared form controls.
- Show both policy associations in the Policy Set catalogue/detail experience.
- Update Recovery Group consumers of `PolicySet` after the model rename, without changing Recovery Group submission behavior.

## Assumptions

- `recovery_app_policy_id` is required because the published contract is a non-null string and the requested UI permits selecting exactly one policy.
- At least one snapshot policy remains required, matching the current UI and validation. The empty array in the example is treated as placeholder data, not a relaxation of this rule.
- GET, POST/upsert, and DELETE responses all return the new Policy Set representation. No compatibility parser for the old `policy_ids` field will be added unless backend rollout requires mixed-version support.

## Architecture decisions

- Keep backend snake_case isolated in Zod wire schemas and API mappers; components consume camelCase domain data only.
- Rename ambiguous `policyIds` to `snapshotPolicyIds`, because Policy Sets now contain two distinct policy categories.
- Represent the Recovery App Policy association as a scalar `recoveryAppPolicyId: string`; the type and radio-group UI enforce one selection rather than relying only on runtime checks.
- Use `useRecoveryAppPolicies()` in the Policy Set feature. Its existing query key provides request deduplication and cache reuse; do not add a Policy Set-specific recovery-policy request.
- Submit IDs only. Policy Set state must not embed full Snapshot Policy or Recovery App Policy objects.
- Never silently clear an existing association when a referenced policy is absent from the current catalogue. Preserve its ID and show an explicit unavailable reference until the user selects a replacement.
- Use existing shared controls (`RadioField`, `Button`, `Spinner`, modal and detail components); do not create new shared components for this change.

## Dependency flow

```text
Policy Set wire schema and mapper
        |
        v
Policy Set domain/form model
        |
        +--> Snapshot Policy catalogue (existing hook/cache)
        |
        +--> Recovery App Policy catalogue (existing hook/cache)
        |
        v
Create/edit form --> submit/upsert --> authoritative Policy Set cache response
        |
        +--> Policy Set table/detail
        +--> Recovery Group Policy Set selector
```

## Task 1: Lock the new API contract with tests

**Description:** Update the Policy Set API fixtures and expectations first so the required read/write contract is explicit before changing implementation. Cover normalization of both policy fields, exact POST serialization, malformed response rejection, and invalid submit rejection.

**Acceptance criteria:**

- [ ] GET tests expect `snapshot_policy_ids` and `recovery_app_policy_id` and normalize them to camelCase.
- [ ] POST tests assert the exact new JSON body and reject an empty Recovery App Policy ID before any request.
- [ ] Response tests reject missing/empty required associations and no longer accept the legacy `policy_ids` shape.

**Verification:**

- [ ] Run `npm test -- src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts` and confirm failures describe only the not-yet-implemented contract.

**Dependencies:** None.

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts`
- `src/features/recovery-plans/policy-sets/hooks/policySetHooks.test.tsx`

**Estimated scope:** Small (2 files, about 30-45 minutes).

## Task 2: Migrate Policy Set domain and wire models

**Description:** Implement the new contract in the domain type, Zod schemas, and API mappers. Rename the existing snapshot-policy collection to `snapshotPolicyIds`, add required `recoveryAppPolicyId`, and map only at the API boundary.

**Acceptance criteria:**

- [ ] `PolicySet` and `PolicySetSubmitData` expose `snapshotPolicyIds` and required `recoveryAppPolicyId`.
- [ ] Wire validation requires `snapshot_policy_ids` and a non-empty `recovery_app_policy_id`.
- [ ] GET, submit/upsert, and delete response mapping use the new fields without accepting legacy aliases.

**Verification:**

- [ ] `npm test -- src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts src/features/recovery-plans/policy-sets/hooks/policySetHooks.test.tsx` passes.
- [ ] Inspect the POST expectation and confirm no camelCase or legacy `policy_ids` field crosses the API boundary.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/model/policySetTypes.ts`
- `src/features/recovery-plans/policy-sets/api/schemas/policySetsSchema.ts`
- `src/features/recovery-plans/policy-sets/api/policySetsApi.ts`
- `src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts`
- `src/features/recovery-plans/policy-sets/hooks/policySetHooks.test.tsx`

**Estimated scope:** Medium (5 files, about 45-75 minutes).

## Checkpoint: Contract foundation

- [ ] Focused API and hook tests pass.
- [ ] The normalized model and wire model have distinct, unambiguous names.
- [ ] Confirm with the backend owner that the new response field is `snapshot_policy_ids`, not the legacy `policy_ids`.

## Task 3: Add cached Recovery App Policy selection to the form

**Description:** Extend Policy Set form state and create/edit mapping with a single `recoveryAppPolicyId`. Load options through `useRecoveryAppPolicies`, render them with the existing shared `RadioField`, validate one selection, and submit it with the snapshot policy IDs.

**Acceptance criteria:**

- [ ] The form shows separate Snapshot Policies and Recovery Application Policy sections.
- [ ] Selecting a recovery policy replaces the previous selection; create and edit submit exactly one ID.
- [ ] Loading, error, empty, and stale-reference states are visible and do not silently erase existing IDs.
- [ ] Editing preselects the stored snapshot and recovery policy associations.
- [ ] The save action cannot submit until required policy selections are valid.

**Verification:**

- [ ] `npm test -- src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx` passes.
- [ ] Test cache reuse by preloading the `recoveryAppPolicyKeys.list()` query and confirming the form renders those options through the existing hook/query key.
- [ ] Manually verify create, edit, query error, empty catalogue, and unavailable referenced-policy states.

**Dependencies:** Task 2.

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`

**Estimated scope:** Medium (3 files, about 60-90 minutes).

## Task 4: Add localized Policy Set copy

**Description:** Add precise labels, empty/error text, validation messages, and detail labels for Snapshot Policies and the singular Recovery Application Policy in all supported locales.

**Acceptance criteria:**

- [ ] English, Slovak, and Czech contain the same new translation keys.
- [ ] Existing generic “Policies” text is made unambiguous wherever it now refers only to snapshot policies.
- [ ] No new user-facing string is hardcoded in the Policy Set components.

**Verification:**

- [ ] Parse all three JSON locale files successfully.
- [ ] Search the changed Policy Set components for newly introduced hardcoded user-facing copy.

**Dependencies:** Task 3.

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Small (3 files, about 20-30 minutes).

## Task 5: Expose both associations in the catalogue and detail drawer

**Description:** Update the Policy Set table and detail drawer so users can verify the snapshot-policy count/names and the selected Recovery App Policy after create or edit. Resolve names from the existing Snapshot and Recovery App Policy hooks while retaining ID fallbacks.

**Acceptance criteria:**

- [ ] The table distinguishes snapshot policy count from the selected Recovery App Policy.
- [ ] The detail drawer resolves both policy types to names and falls back to IDs if catalogue records are unavailable.
- [ ] Loading or failure of a reference catalogue does not hide the Policy Set list itself.

**Verification:**

- [ ] `npm test -- src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx` passes.
- [ ] Manually open a detail drawer with known and missing referenced IDs and verify readable fallback output.

**Dependencies:** Tasks 2 and 4.

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

**Estimated scope:** Small (2 files, about 30-45 minutes).

## Task 6: Migrate Recovery Group consumers and regression fixtures

**Description:** Update all Recovery Group consumers and test fixtures to the renamed Policy Set fields. Preserve the existing Recovery Group workflow: it still selects a Policy Set by ID and does not duplicate the Policy Set's policy associations in its own request.

**Acceptance criteria:**

- [ ] Recovery Group policy-set cards count `snapshotPolicyIds` and continue selecting a set by its ID.
- [ ] Recovery Group builder/table fixtures include the complete new Policy Set shape.
- [ ] No legacy `policyIds` or `policy_ids` reference remains under `src/features/recovery-plans`.

**Verification:**

- [ ] Run `npm test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`.
- [ ] Run `rg -n "policyIds|policy_ids" src/features/recovery-plans` and confirm no legacy Policy Set field remains.

**Dependencies:** Task 2.

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`

**Estimated scope:** Medium (4 files, about 30-45 minutes).

## Checkpoint: Complete feature flow

- [ ] Create and edit forms load both catalogues and submit the new backend payload.
- [ ] Policy Set list/detail and Recovery Group selection consume the normalized model.
- [ ] Focused Policy Set and Recovery Group tests pass.
- [ ] Review the UI in English, Slovak, and Czech before final quality gates.

## Task 7: Run production quality gates

**Description:** Verify the complete change against repository-wide static analysis, unit/UI tests, and the production build. Investigate real regressions; do not weaken assertions or disable checks to obtain a green result.

**Acceptance criteria:**

- [ ] All focused tests from Tasks 1-6 pass.
- [ ] Lint and TypeScript checks pass with zero warnings/errors.
- [ ] The production build completes and no unrelated worktree changes are modified or committed.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] Review `git status --short` and confirm the change set contains only approved Policy Set/consumer files.

**Dependencies:** Tasks 3-6.

**Files likely touched:** None unless verification reveals an in-scope defect.

**Estimated scope:** Small (about 20-40 minutes, longer only if the known Vitest worker timeout recurs).

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Backend still returns `policy_ids` during a staggered rollout | High | Confirm deployment contract at the foundation checkpoint; add a temporary compatibility parser only if mixed versions are an explicit requirement. |
| `recovery_app_policy_id` may actually be optional | Medium | Current plan treats it as required. If backend confirms optionality, model it as `string \| null`, provide a clear “none” state, and omit/serialize according to the confirmed contract. |
| Referenced policy was deleted or is unavailable | Medium | Preserve the stored ID, show an unavailable reference, and require an explicit replacement rather than silently clearing it. |
| Catalogue query fails while Policy Sets load | Medium | Keep Policy Set list usable, show localized reference-loading feedback, and retain ID fallbacks. |
| React Query cache is stale | Low | Reuse the authoritative existing query key and current hook behavior; mutation hooks already replace their catalogue caches from backend responses. |
| Full Vitest run repeats the worker timeout seen previously | Medium | Capture the failing command/output, verify focused projects in isolation, then diagnose the runner separately rather than masking the timeout in feature code. |

## Out of scope

- Backend endpoint implementation or backend data migration.
- Changes to Recovery App Policy CRUD itself.
- Redesigning snapshot-policy selection from the current single-choice UI to multi-select.
- Changes to Recovery Group payload semantics.
- New routes, sidebar items, or shared components.

## Open contract question

- Confirm before implementation checkpoint whether `snapshot_policy_ids` must contain at least one entry. This plan intentionally preserves the current frontend requirement until the backend owner states otherwise.

## Estimated total

Approximately 4-6 focused engineering hours, including tests and production build verification, excluding backend contract clarification or investigation of an unrelated Vitest worker failure.
