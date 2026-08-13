# Task Checklist: Generated Runtime API Contracts

## Planning

- [x] Inspect the generated Zod schemas and current feature response parsers.
- [x] Reproduce the `recovery_group.description` contract drift.
- [x] Define generated, domain-adapter and manual-validation boundaries.
- [x] Record the implementation plan and acceptance criteria.
- [x] User approved planning and implementation in the same request.

## Implementation

- [x] Add and test the shared generated-response parser/error.
- [x] Migrate Recovery Applications list and submit responses.
- [x] Update the Recovery Application mapper/domain for omitted group details.
- [x] Surface response contract diagnostics in the Recovery Applications error state.
- [x] Migrate provider response validation.
- [x] Migrate credential response validation; preserve manual pubkey handling.
- [x] Migrate platform-provider response validation.
- [x] Migrate Recovery Groups response validation.
- [x] Migrate Policy Sets response validation.
- [x] Migrate snapshot-policy response validation.
- [x] Migrate application-recovery-policy response validation.
- [x] Migrate clean-room-policy response validation.
- [x] Classify and migrate exact discovery response contracts.
- [x] Document intentionally retained dynamic discovery schemas.
- [x] Remove unused handwritten response schemas and imports.

## Verification

- [x] Focused red/green regression test proves current Recovery Applications response.
- [x] Focused tests pass after every feature slice.
- [x] `npm run api:check` passes.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm exec vite build` passes.
- [x] `git diff --check` passes.
- [x] Final reference search confirms `/credentials/pubkey` remains manual and unique.
- [x] Final diff contains no unrelated changes or secrets.
