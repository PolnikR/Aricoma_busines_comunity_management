# Todo: Global Backend Error Message Display

Spec: `docs/superpowers/specs/2026-08-21-backend-error-message-display-spec.md`
Plan: `tasks/backend-error-message-display-plan.md`

## Phase 1: Foundation

- [ ] Task 1: Add shared backend-detail extractor and user-facing message resolver with unit tests.
- [ ] Verify direct/nested `OrvalApiError`, `detail: string`, FastAPI `detail[].msg`, rejected text/HTML/arbitrary bodies, ordinary Error, API fallback, cycle detection, and depth limit.

## Phase 2: Reference integration

- [ ] Task 2: Recovery Groups — replace generic mutation banner with real backend problem when available.
- [ ] Recovery Groups — apply resolver to builder/editor submit errors.
- [ ] Recovery Groups — add backend detail to list fetch Retry state.
- [ ] Recovery Groups — preserve localized `RecoveryGroupsError` code mapping.

## Checkpoint: Recovery Groups

- [ ] Focused Recovery Groups tests pass.
- [ ] Manual Recovery Groups mutation failure keeps the localized title and shows backend problem as the existing red `Alert` description.
- [ ] No Resources/Resources ISE file changed.

## Phase 3: Provider administration

- [ ] Task 3: Providers — list/detail/create/edit/delete/connection-test error display.
- [ ] Task 4: Credentials — list/create/edit/delete error display including FastAPI `detail[]` and native public-key fetch failure handling.
- [ ] Task 5: Platform Providers — list/save/delete error display.

## Checkpoint: Providers

- [ ] Focused Providers/Credentials/Platform Providers tests pass.
- [ ] Backend mutation failures use shared `Alert` rather than one-off red backend-error blocks.
- [ ] Native credential public-key failure never exposes a status-only message or arbitrary text/HTML body.
- [ ] Focused ESLint + `tsc -b` pass.

## Phase 4: Recovery plans

- [ ] Task 6: Recovery Applications — list/submit/edit/delete/supporting lookup errors.
- [ ] Task 7: Policy Sets — list/save/delete/dependent lookup errors.
- [ ] Task 8: Snapshot Policies — list/save/delete errors.
- [ ] Task 9: Recovery App Policies — list/save/delete errors.
- [ ] Task 10: Clean Room Policies — list/save/delete errors.

## Checkpoint: Recovery plan configuration

- [ ] Focused Recovery Applications/Policies/Policy Sets tests pass.
- [ ] Existing tests that hid supported backend detail are updated to the new requirement.
- [ ] Unsupported backend objects remain hidden.

## Phase 5: Remaining backend-backed views

- [ ] Task 11: Recovery Runs — show backend detail in retryable load error.
- [ ] Task 12: Infrastructure Topology — show backend detail for provider/topology HTTP failures only.
- [ ] Confirm Infrastructure client-only layout errors are unchanged.

## Phase 6: Global audit

- [ ] Task 13: Re-scan in-scope frontend for synthetic status-only visible errors.
- [ ] Re-scan native/direct `fetch` seams that do not preserve `OrvalApiError.body`.
- [ ] Re-scan for mutation `.error` states that still have no visible shared Alert.
- [ ] Re-scan for one-off raw red backend-error blocks.
- [ ] Confirm arbitrary plain-text/HTML API bodies remain hidden.
- [ ] Confirm `src/features/discovery-inventory/resources/` remains untouched.
- [ ] Confirm Resources and Resources ISE route behavior remains unchanged.
- [ ] Confirm Identity & Access and Recovery Actions mock flows remain untouched.

## Final verification

- [ ] All focused feature tests pass.
- [ ] Focused ESLint passes for changed files.
- [ ] `node_modules/.bin/tsc.cmd -b` passes.
- [ ] `npm run build` passes because the final rollout is cross-cutting.
- [ ] `git diff --check` passes.
- [ ] Human reviews the complete committed diff before merge/push.
