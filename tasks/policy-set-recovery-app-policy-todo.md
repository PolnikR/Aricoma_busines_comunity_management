# Policy Set Recovery App Policy — Checklist

## Contract foundation

- [x] Update Policy Set API tests for `snapshot_policy_ids` and `recovery_app_policy_id`.
- [x] Rename domain `policyIds` to `snapshotPolicyIds`.
- [x] Add required `recoveryAppPolicyId` to read and submit models.
- [x] Update Zod wire/input schemas and API mappers.
- [x] Verify exact GET/POST/DELETE response normalization and submit serialization.

## Create and edit form

- [x] Reuse `useRecoveryAppPolicies` and its existing React Query cache key.
- [x] Add `recoveryAppPolicyId` to form state, initial state, edit mapping, dirty checking, and submit data.
- [x] Render one Recovery App Policy selection with existing shared `RadioField` controls.
- [x] Handle loading, error, empty, and unavailable referenced-policy states.
- [x] Require exactly one Recovery App Policy and preserve the current snapshot-policy validation.
- [x] Add create/edit/error/empty/stale-reference tests.

## Catalogue and localization

- [x] Add matching English, Slovak, and Czech copy.
- [x] Distinguish Snapshot Policies from Recovery Application Policy in table/detail labels.
- [x] Resolve both policy types to names with ID fallbacks.
- [x] Keep the Policy Set list usable when a reference catalogue fails.

## Recovery Group compatibility

- [x] Update Policy Set consumers to `snapshotPolicyIds`.
- [x] Update Recovery Group Policy Set fixtures with `recoveryAppPolicyId`.
- [x] Preserve selection/submission of the Policy Set by ID.
- [x] Confirm no legacy `policyIds` or `policy_ids` remains under recovery plans.

## Verification checkpoints

- [x] Confirmed frontend is wired to backend field `snapshot_policy_ids`.
- [ ] Confirm with backend whether snapshot policy IDs must remain non-empty.
- [x] Run focused Policy Set API, hook, modal, and table tests.
- [x] Run focused Recovery Group consumer tests.
- [x] Run `npm run lint`.
- [ ] `npm run typecheck` — blocked by pre-existing errors in `src/features/recovery-actions` and `src/shared/components/tabs/WorkspaceTabs.tsx`.
- [ ] `npm test` — blocked by the existing Vitest worker timeout after 180 seconds.
- [ ] `npm run build` — not run because it invokes the blocked full test/typecheck gates.
- [x] Run `git diff --check` and review scope with `git status --short`.
- [x] User approved implementation by saying `go`.
