# Todo: Vitest Keycloak Unit-Test Failures

## Task 1: Add a deterministic Node Keycloak setup

**Description:** Create a Node-safe unit setup that mocks
`@/config/keycloak` before unit files import `apiClient`. Export the mock for
focused auth tests and reset its token, `updateToken`, and `logout` behavior
before every test. Register it only for the `unit` Vitest project.

**Acceptance criteria:**

- [ ] Every unit test starts with a valid test token and successful refresh.
- [ ] Keycloak mock call history and overridden behavior cannot leak between tests.
- [ ] UI setup, Node environment, `isolate`, and production source remain unchanged.

**Verification:**

- [ ] Run `src/shared/api/orvalMutator.test.ts` and confirm its five tests pass.
- [ ] Run `src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts` and confirm its nine tests pass.
- [ ] Run focused ESLint for the new setup and `vitest.config.ts`.

**Dependencies:** None

**Files likely touched:**

- `src/test-utils/setupUnit.ts`
- `vitest.config.ts`

**Estimated scope:** Small

## Task 2: Use the shared double in apiClient tests

**Description:** Remove the competing file-local Keycloak module mock from
`apiClient.test.ts` and control the setup-owned double for refresh success,
refresh failure, logout failure, and missing-token cases.

**Acceptance criteria:**

- [ ] All six current `apiFetch` behaviors remain asserted.
- [ ] The test passes alone and alongside API consumer tests.
- [ ] The test still proves that refresh precedes fetch and locked headers win.

**Verification:**

- [ ] `npm exec vitest run src/shared/api/apiClient.test.ts`
- [ ] Run `apiClient.test.ts` with `orvalMutator.test.ts` in both argument orders.
- [ ] Run focused ESLint for `apiClient.test.ts`.

**Dependencies:** Task 1

**Files likely touched:**

- `src/shared/api/apiClient.test.ts`

**Estimated scope:** Small

## Checkpoint: Root cause removed

- [ ] Representative unit tests no longer execute real `Keycloak.logout`.
- [ ] No representative failure contains `window is not defined`.
- [ ] No production TypeScript/TSX file changed.
- [ ] `src/test-utils/setup.ts` remains an unstaged pre-existing modification.

## Task 3: Run the original 16-file failure set

**Description:** Run the exact files recorded in the plan together. Treat any
remaining failure as new evidence; do not update assertions until its independent
cause is understood.

**Acceptance criteria:**

- [ ] All 16 files pass together.
- [ ] All 119 formerly failing cases reach and satisfy their original assertions.
- [ ] No order-dependent result appears on a second run.

**Verification:**

- [ ] Run the exact 16-file list from the plan twice.
- [ ] Confirm zero Keycloak/window setup failures in both runs.

**Dependencies:** Tasks 1 and 2

**Files likely touched:** None; verification task

**Estimated scope:** Small

## Checkpoint: API regression set

- [ ] 16/16 files pass.
- [ ] No residual failure is hidden or reclassified without its stack trace.
- [ ] If a different root cause remains, stop and amend the plan.

## Task 4: Run final verification

**Description:** Run the complete suite and static checks, then commit only the
unit setup, Vitest configuration, and apiClient test changes.

**Acceptance criteria:**

- [ ] Complete Vitest suite has zero failures.
- [ ] Typecheck, focused lint, and diff checks pass.
- [ ] The staged diff excludes the user's existing UI setup modification.

**Verification:**

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] Focused ESLint for the three task-owned files.
- [ ] `git diff --check` and staged diff inspection.

**Dependencies:** Task 3

**Files likely touched:** None beyond Tasks 1-2

**Estimated scope:** Small

