# Implementation Plan: Recovery Application Group Reference Schema Fix

## Overview
`submit_recovery_dag` returns `422 Unprocessable Content` whenever a Recovery Application tier has a Recovery Group attached. The embedded `recovery_group` object built by `RecoveryAppBuilder.tsx` never sets the backend-required `id` field — it stores the group's id inside `name` instead. This went uncaught because the frontend's hand-written `RecoveryApplicationData`/`RecoveryTier`/`RecoveryGroup` types duplicate (and have drifted from) the generated `RecoveryTier`/`RecoveryGroupRef` contract in `zod.gen.ts`, and an `as` cast at the API-call boundary suppresses the resulting structural mismatch. This plan fixes the immediate bug and removes the duplicate-type/cast pattern that let it go undetected, so future backend contract changes fail the build instead of failing at runtime.

## Architecture Decisions
- Treat the generated `zod.gen.ts` types (`RecoveryTier`, `RecoveryGroupRef`, `RecoveryAppSubmission`) as the single source of truth for the submission payload shape; stop hand-duplicating this shape in `recoveryApplicationTypes.ts`.
- Remove the `as Parameters<typeof submitRecoveryDagSubmitRecoveryDagPost>[0]` cast in `recoveryApplicationsApi.ts` so the compiler enforces structural compatibility between what the app builds and what the generated client expects.
- Form-state-only concerns (e.g. `RecoveryApplicationFormState`, UI-only fields like `description`/`volumes` on a group reference used for display) stay as separate, additive types layered on top of the generated shape — not merged into it — so the generated contract itself is never hand-edited.
- Fix the two runtime call sites (`handleRecoveryGroupAdded`, `handleRecoveryVmSelectionChange`) that conflated `id` and `name`, and the response-mapping path (`mapRecoveryTier`) that drops `id` on read.

## Task List

### Phase 1: Foundation — align types to the generated contract
- [ ] Task 1: Add `id` to the frontend `RecoveryGroup`/`RecoveryTier` model and remove the unsafe cast
- [ ] Task 2: Fix `mapRecoveryTier` to preserve `recovery_group.id` on GET responses

### Checkpoint: Foundation
- [ ] `npx tsc --noEmit` (or project's typecheck script) passes
- [ ] No remaining hand-rolled duplication of `id`/`name` shape gaps for `recovery_group`

### Phase 2: Core Fix — builder behavior
- [ ] Task 3: Fix `RecoveryAppBuilder.tsx` to populate `id`+`name` correctly on group attach, and to look up groups by `id`

### Checkpoint: Core Features
- [ ] Manually verified (or test-covered): attaching a recovery group to a tier and submitting no longer 422s
- [ ] Existing recovery-group label displays (`TierCard`, `TierCanvas`) show the human-readable name, not the slug id

### Phase 3: Tests
- [ ] Task 4: Update test fixtures and add coverage for the submission payload and mapping round-trip

### Checkpoint: Complete
- [ ] Focused tests pass: `npx vitest run` for the four touched test files (see Task 4)
- [ ] All acceptance criteria met
- [ ] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Removing the cast surfaces other, unrelated structural mismatches between `RecoveryApplicationData` and `RecoveryAppSubmission` | Medium — could expand scope beyond this fix | Fix Task 1 first in isolation; if `tsc` reveals further gaps, report them before proceeding rather than silently patching around them |
| Existing tests/fixtures assume `recovery_group` has no `id`, causing new failures unrelated to the fix | Low — already observed in an earlier attempt | Task 4 explicitly updates all fixtures found in `recoveryApplicationsApi.test.ts`, `RecoveryAppBuilder.test.tsx`, `recoveryApplicationFormMapper.test.ts` |
| Changing the group lookup key (`name` → `id`) in `handleRecoveryVmSelectionChange` breaks VM selection if any other code still keys off `recovery_group.name` as an id | Low | Grep confirmed only two call sites use `recovery_group.name`/`.id` for lookup logic (both in `RecoveryAppBuilder.tsx`); display-only usages are unaffected by the key change |

## Open Questions
- None — scope and approach (Option B) already confirmed with the user.
