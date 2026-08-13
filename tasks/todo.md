# Task Checklist: Generated Runtime API Contracts

## Planning

- [x] Inspect the generated Zod schemas and current feature response parsers.
- [x] Reproduce the `recovery_group.description` contract drift.
- [x] Define generated, domain-adapter and manual-validation boundaries.
- [x] Record the implementation plan and acceptance criteria.
- [x] User approved planning and implementation in the same request.

## Implementation

- [ ] Add and test the shared generated-response parser/error.
- [ ] Migrate Recovery Applications list and submit responses.
- [ ] Update the Recovery Application mapper/domain for omitted group details.
- [ ] Surface response contract diagnostics in the Recovery Applications error state.
- [ ] Migrate provider response validation.
- [ ] Migrate credential response validation; preserve manual pubkey handling.
- [ ] Migrate platform-provider response validation.
- [ ] Migrate Recovery Groups response validation.
- [ ] Migrate Policy Sets response validation.
- [ ] Migrate snapshot-policy response validation.
- [ ] Migrate application-recovery-policy response validation.
- [ ] Migrate clean-room-policy response validation.
- [ ] Classify and migrate exact discovery response contracts.
- [ ] Document intentionally retained dynamic discovery schemas.
- [ ] Remove unused handwritten response schemas and imports.

## Verification

- [ ] Focused red/green regression test proves current Recovery Applications response.
- [ ] Focused tests pass after every feature slice.
- [ ] `npm run api:check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm exec vite build` passes.
- [ ] `git diff --check` passes.
- [ ] Final reference search confirms `/credentials/pubkey` remains manual and unique.
- [ ] Final diff contains no unrelated changes or secrets.
