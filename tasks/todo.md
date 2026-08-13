# Task Checklist: Orval API Contract Generation

## Planning

- [x] Inspect the current API client, endpoint registry, feature APIs and hooks.
- [x] Validate the supplied OpenAPI structure and identify the public-key exception.
- [x] Define the generated/manual boundary.
- [x] User approves `tasks/plan.md`.

## Implementation

- [x] Add and validate `openapi/abco-api.json`.
- [x] Add the codegen filter that excludes only `/credentials/pubkey`.
- [x] Add pinned Orval dependency, configuration and package scripts.
- [x] Add tests and implementation for the shared Orval fetch mutator.
- [x] Generate typed fetch clients, TypeScript models and Zod schemas.
- [x] Verify deterministic output and absence of generated pubkey code.
- [x] Migrate providers while retaining existing hooks/cache behavior.
- [x] Migrate credentials while retaining manual `credentialsCrypto.ts`.
- [x] Migrate platform providers.
- [x] Migrate recovery policies and policy sets.
- [x] Migrate Recovery Groups.
- [x] Migrate Recovery Applications.
- [x] Migrate discovery APIs by technology.
- [x] Remove only confirmed-unused manual contracts and endpoint constants.

## Verification

- [x] Focused tests pass at every migration checkpoint.
- [ ] `npm run api:generate` is deterministic.
- [ ] `npm run api:check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm exec vite build` passes.
- [ ] `git diff --check` passes.
- [ ] Final reference search confirms pubkey remains manual and unique.
