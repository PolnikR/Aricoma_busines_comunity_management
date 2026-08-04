# Recovery Group Policy Sets — Design

## Background

Three new backend endpoints exist for **policy sets**: a policy set is a named,
described collection of existing `SnapshotPolicy` entities (referenced by
`policy_ids`). A policy set is attached to a `RecoveryGroup` via a required
`policy_set_id` field, already present on both the read (`get_recovery_groups`)
and write (`submit_recovery_group`) payloads on the backend.

Today, `RecoveryGroup` has no notion of a policy set at all, and there is no
frontend feature for managing policy sets. This spec covers both: a new
`policy-sets` feature, and wiring the attachment into recovery groups.

## Backend API contracts

```
GET /api/get_policy_sets
  -> { policy_sets: [{ id, name, description, policy_ids: string[] }] }

POST /api/submit_policy_set
  body: { id, name, description, policy_ids: string[] }
  -> { policy_sets: [...] }  (full updated list, same shape as GET)

DELETE /api/delete_policy_set?policy_set_id=<id>
  -> { policy_sets: [...] }  (full updated list, same shape as GET)
```

`GET /api/get_recovery_groups` and `POST /api/submit_recovery_group` both
carry `policy_set_id` (confirmed from a live response sample):

```json
{
  "id": "database_group",
  "name": "database_group",
  "description": "Recovery group containing the database tier VMs",
  "provider_id_vm": "vmware-vcenter-01",
  "provider_id_volume": "ibm-flashsystem-01",
  "policy_set_id": "tier2-apps",
  "vms": [{ "name": "TEST-DB01" }],
  "volumes": [{ "name": "TEST-VOLUME1" }]
}
```

## 1. New `policy-sets` feature

Location: `src/features/recovery-plans/policy-sets/`, a sibling of
`snapshot-policies`, `recovery-groups`, and `recovery-applications`. This
mirrors the existing `snapshot-policies` feature structure and conventions
directly, since the endpoint shapes are the same pattern (list/submit/delete;
submit and delete both return the full updated list).

- `model/policySetTypes.ts`
  - `PolicySet { id: string; name: string; description: string; policyIds: string[] }`
  - `PolicySetSubmitData` (same shape as `PolicySet`, kept as a separate type
    for the same reason `SnapshotPolicySubmitData` is separate — read/write
    shapes can evolve independently even though they're currently identical).
- `api/schemas/policySetsSchema.ts` — `policySetsResponseSchema` (parses
  `{ policy_sets: [...] }`), `policySetSubmitSchema`, `PolicySetWire` type.
- `api/policySetsApi.ts` — `fetchPolicySets`, `submitPolicySet`,
  `deletePolicySet`. Structure mirrors `snapshotPoliciesApi.ts`: a
  `parsePolicySets` helper shared by all three functions, `fromWire`/`toWire`
  mappers, `requireSuccessfulResponse` error handling.
- `api/policySetQueryKeys.ts` — query key factory, mirrors
  `snapshotPolicyQueryKeys.ts`.
- `hooks/usePolicySets.ts`, `useSubmitPolicySet.ts`, `useDeletePolicySet.ts` —
  mirror the equivalent snapshot-policies hooks (React Query wrappers with
  cache invalidation on submit/delete).
- `components/PolicySetModal.tsx`, `PolicySetForm.tsx`, `PolicySetsTable.tsx`
  — mirror `SnapshotPolicyModal`/`SnapshotPolicyForm`/`SnapshotPoliciesTable`.
  The form's `policyIds` field is a multi-select populated from
  `useSnapshotPolicies()` — creating/editing a policy set means picking from
  already-defined snapshot policies.
- `pages/PolicySetsPage.tsx` — mirrors `SnapshotPoliciesPage.tsx`.

### Config and navigation additions

`src/config/apiEndpoints.ts`:
```ts
policySets: {
  list: '/api/get_policy_sets',
  submit: '/api/submit_policy_set',
  delete: '/api/delete_policy_set',
},
```

New route `routes.policySets`, added to `AppRoutes.tsx`.

`AppSidebar.tsx`: new sibling nav item under the existing "Recovery Plans"
group, alongside "Snapshot Policies":

```
Recovery Plans
  Recovery Applications
  Recovery Groups
  Snapshot Policies
  Policy Sets      <- new
  Recovery Runs
```

Plus the matching `navKeyMap` translation-key entry.

## 2. Recovery Group integration

### Model

`recoveryGroupTypes.ts`:
- `RecoveryGroup` gains `policySetId: string` (required — a saved recovery
  group always has a policy set attached, per the confirmed backend contract).
- `RecoveryGroupDraft` gains `policySetId: string | null` (`null` while
  unselected during the wizard; validated to non-null before create/update
  can submit).

### API / schema / mapping

- `recoveryGroupsSchema.ts`: `recoveryGroupApiSchema` gains
  `policy_set_id: z.string()`; `RecoveryGroupSubmitPayload` gains
  `policy_set_id: string`.
- `mapRecoveryGroups.ts`: `mapRecoveryGroupApiRecord`/`toRecoveryGroup` read
  `policy_set_id` into `policySetId`; `toRecoveryGroupSubmitPayload` writes
  `draft.policySetId` back out as `policy_set_id`.
- `recoveryGroupsValidation.ts`: `validateRecoveryGroupDraft` requires
  `policySetId` to be a non-empty string, same style as the existing required
  fields.

### Wizard UI

`RecoveryGroupBuilder.tsx` gains a new step, **"Policy Set"** — a new
`RecoveryGroupPolicySetStep.tsx` component, following the existing "one step
= one concern" pattern (Details/Type/Provider/Resources are each already
their own step). It's a single-select list of existing policy sets, fetched
via `usePolicySets()`.

Placement: after Resources (and Related Storage, when present), as the final
step before Create/Update. Gated the same way later steps already are
(`disabled` until earlier steps are valid). `canContinue`/`canCreate` extend
to require `draft.policySetId`.

### Display

`RecoveryGroupsTable.tsx` and the recovery group detail/editor views show the
attached policy set's name (looked up by id via `usePolicySets()`).

## 3. Testing

New feature (mirrors `snapshot-policies` test coverage):
- `policySetsApi.test.ts`, `policySetQueryKeys.test.ts`
- Hook tests for `usePolicySets`/`useSubmitPolicySet`/`useDeletePolicySet`
- `PolicySetModal.test.tsx`, `PolicySetForm` coverage, `PolicySetsTable.test.tsx`
- `PolicySetsPage.test.tsx`

Recovery group updates:
- `recoveryGroupsApi.test.ts` and `mapRecoveryGroups` tests updated for
  `policy_set_id` on both read and write paths.
- `RecoveryGroupBuilder.test.tsx` updated for the new step and its validation
  gating.
- `RecoveryGroupEditorPage.test.tsx` / `RecoveryGroupsListPage.test.tsx`
  updated for displaying/editing the attached policy set.

## Out of scope

- Editing which snapshot policies belong to an *existing* policy set that's
  already attached to a recovery group is just editing the policy set itself
  (via the Policy Sets page) — no special recovery-group-specific interaction
  is needed.
- No changes to the snapshot-policies feature itself; it's consumed read-only
  by the new policy-sets picker.
