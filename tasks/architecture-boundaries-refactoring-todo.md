# Todo: Feature Boundaries and Duplication Reduction

Detailed acceptance criteria, verification commands, dependencies, and likely files
are in `tasks/architecture-boundaries-refactoring-plan.md`.

## Phase 1: Ownership and provider seam

- [ ] T1 Establish feature-owned policy-set picker.
- [ ] T2 Remove the shared policy-set compatibility path.
- [ ] T3 Define the infrastructure-provider public contract.

## Checkpoint A

- [ ] Focused T1-T3 tests pass together.
- [ ] `shared` has no feature import.
- [ ] Human approves the provider public surface.
- [ ] T1-T3 are separate atomic commits.

## Phase 2: Break provider/platform/discovery cycles

- [ ] T4 Move resource pages onto the provider public contract.
- [ ] T5 Remove provider-to-discovery and provider-to-platform imports.
- [ ] T6 Define the platform-provider public contract.

## Checkpoint B

- [ ] Focused T4-T6 tests pass together.
- [ ] Provider feature has no reverse dependency edge.
- [ ] Query keys and network behavior are unchanged.

## Phase 3: Recovery integration boundary

- [ ] T7 Introduce a recovery-owned provider catalog.
- [ ] T8 Make recovery-group transport recovery-owned.

## Checkpoint C

- [ ] Focused T7-T8 tests pass together.
- [ ] Recovery builder/transport expose only recovery-owned contracts.
- [ ] Human approves the recovery catalog depth.

## Phase 4: Consolidate duplication

- [ ] T9 Share pure resource-page logic without merging page components.
- [ ] T10 Extract the recovery-group editor session.
- [ ] T11 Extract the recovery-application editor session.

## Checkpoint D

- [ ] Focused T9-T11 tests pass together.
- [ ] Resource transitions remain flicker-free and recovery create/edit flows pass smoke checks.
- [ ] No route, payload, or query-string behavior changed.

- [ ] T12 Extract the policy modal lifecycle.
- [ ] T13 Introduce one typed route and navigation registry.

## Checkpoint E

- [ ] Focused T12-T13 tests pass together.
- [ ] All policy variants pass cancel/save smoke checks.
- [ ] All routes preserve URL, redirect, lazy-load, and active-nav behavior.

## Phase 5: Enforcement

- [ ] T14 Add the architecture dependency guard.

## Final Checkpoint

- [ ] `npm run architecture:check` passes without an allowlist.
- [ ] Combined focused Vitest run passes.
- [ ] Changed files pass focused ESLint and typecheck.
- [ ] Required UI/network smoke checks pass.
- [ ] Each task has an atomic, in-scope commit.
- [ ] Human approves completion before merge.

## Approval Gate

- [ ] Behavior-preserving scope confirmed.
- [ ] `public.ts` (or chosen alternative) convention confirmed.
- [ ] Architecture check integration target confirmed.
