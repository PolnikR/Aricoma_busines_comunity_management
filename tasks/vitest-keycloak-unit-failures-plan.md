# Implementation Plan: Vitest Keycloak Unit-Test Failures

## Overview

Repair the unit-test infrastructure regression introduced when `apiFetch`
started refreshing and attaching the Keycloak access token. The full Vitest run
on 2026-08-25 produced 16 failed files and 119 failed tests, but the reproduced
failures share one upstream cause: the Node `unit` project loads the real
Keycloak instance because it has no Keycloak setup file and runs with
`isolate: false`.

This is a test-infrastructure correction. Production authentication behavior,
API mapping logic, assertions, and feature code must not be weakened to make the
suite pass.

## Reproduced Baseline

Command:

```text
C:\Users\polnikr\AppData\Roaming\nvm\v22.23.1\npm.cmd test
```

Result:

```text
Test Files  16 failed | 244 passed (260)
Tests       119 failed | 1150 passed (1269)
Duration    732.22s
```

Representative failures:

- `ReferenceError: window is not defined` from `reauthenticate` in
  `src/shared/api/apiClient.ts`;
- real `Keycloak.logout` called from `apiClient.test.ts` instead of the local
  mock; and
- downstream API/helper assertions never reached because `apiFetch` failed
  before the stubbed browser `fetch` call.

Isolation evidence:

- `apiClient.test.ts` passes alone: 6/6 tests;
- `orvalMutator.test.ts` plus `virtualMachinesHelpers.test.ts` reproduce 12
  failures with the same missing unit Keycloak mock;
- the UI project already loads `src/test-utils/setup.ts`, while the Node unit
  project defines no `setupFiles` and uses `isolate: false`.

## Root Cause

The Keycloak token propagation change made every API test depend on a valid
Keycloak adapter state. UI tests receive a Keycloak mock through the currently
modified `src/test-utils/setup.ts`. Unit `.test.ts` files do not load that setup.

Because unit isolation is disabled, whichever unit file first imports
`apiClient` determines the cached Keycloak dependency for later files. The local
`vi.mock('@/config/keycloak', ...)` in `apiClient.test.ts` therefore works when
that file runs alone but is not a reliable suite-wide boundary.

## Architecture Decisions

- Add a dedicated Node unit setup instead of loading the DOM-oriented UI setup
  into the Node environment.
- The unit setup owns one exported, resettable Keycloak test double with a valid
  default token, successful `updateToken`, and successful `logout`.
- Register the unit setup through the `unit` project in `vitest.config.ts` so
  every `.test.ts` API consumer receives the same deterministic adapter before
  importing `apiClient`.
- Reset only the Keycloak double before each test. Do not globally reset all
  mocks because individual suites own their own fetch and module mocks.
- Update `apiClient.test.ts` to control the shared unit double instead of
  declaring a competing per-file Keycloak module mock.
- Preserve `environment: 'node'`, `isolate: false`, worker settings, and all
  existing production code.
- Preserve the user's current uncommitted `src/test-utils/setup.ts` change. It
  belongs to the UI test project and must not be overwritten or staged with this
  work unless the user explicitly expands the task.

## Dependency Graph

```text
Node Keycloak setup
    -> unit project registration
        -> apiClient test uses the same double
            -> originally failed 16-file regression set
                -> complete Vitest suite
```

## Task List

### Phase 1: Deterministic unit authentication setup

1. Add the shared Node Keycloak test double and register it as the unit project's
   setup file.
2. Replace the competing local Keycloak mock in `apiClient.test.ts` with the
   shared unit double.

### Checkpoint: Root-cause verification

- [ ] `apiClient.test.ts` passes alone.
- [ ] `apiClient.test.ts` passes when run with `orvalMutator.test.ts` in either
      argument order.
- [ ] The representative VM helper file reaches its own mapping/filter
      assertions instead of failing in `reauthenticate`.
- [ ] No production source file changes.

### Phase 2: Regression verification

3. Run all 16 originally failed files together and inspect any residual failure
   before changing assertions or feature code.
4. Run the complete Vitest suite and confirm the failure count is zero.

### Final Checkpoint

- [ ] All 260 test files and 1269 tests pass, unless the repository gained new
      tests after the captured baseline.
- [ ] Focused ESLint passes for the changed setup/config/test files.
- [ ] `npm run typecheck` passes because the new shared double is imported by a
      TypeScript test.
- [ ] `git diff --check` passes.
- [ ] Only task-owned files are staged; the pre-existing `src/test-utils/setup.ts`
      modification remains untouched and unstaged.

## Originally Failed Files

1. `src/shared/api/apiClient.test.ts`
2. `src/shared/api/orvalMutator.test.ts`
3. `src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`
4. `src/features/discovery-inventory/resources/api/vmsByNameApi.test.ts`
5. `src/features/discovery-inventory/resources/api/vmwareTagsApi.test.ts`
6. `src/features/discovery-inventory/resources/api/vmStorageVolumesApi.test.ts`
7. `src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts`
8. `src/features/providers-connectors/providers/api/providersApi.test.ts`
9. `src/features/providers-connectors/credentials/api/credentialsApi.test.ts`
10. `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`
11. `src/features/platform-administration/identity-access/api/identityAccessApi.test.ts`
12. `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
13. `src/features/recovery-plans/recovery-policies/application-recovery/api/recoveryAppPoliciesApi.test.ts`
14. `src/features/recovery-plans/recovery-policies/clean-room/api/cleanRoomPoliciesApi.test.ts`
15. `src/features/recovery-plans/recovery-policies/snapshot/api/snapshotPoliciesApi.test.ts`
16. `src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts`

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A global mock hides authentication behavior | High | Keep success defaults only in unit setup; retain explicit refresh/missing-token/logout cases in `apiClient.test.ts` |
| Shared mock state leaks with `isolate: false` | High | Reset token and only its two functions before every test |
| Loading UI setup in Node introduces DOM assumptions | Medium | Use a dedicated unit setup with no Testing Library or jest-dom import |
| Test order still affects the module cache | High | Use one setup-owned module mock and verify mixed-file runs in both argument orders |
| Assertions are changed to mask the root cause | High | First require all tests to reach their original fetch/schema assertions without production or assertion changes |
| Existing user work is accidentally committed | Medium | Do not stage `src/test-utils/setup.ts`; inspect staged diff before committing |

## Out of Scope

- Changing `apiFetch`, `AuthProvider`, Keycloak runtime configuration, token
  storage, or logout behavior.
- Adding `window` to the Node unit environment as a workaround.
- Switching all unit tests to jsdom.
- Enabling per-file isolation or increasing workers without evidence that it is
  required after the setup correction.
- Bulk-editing the 119 failed tests or weakening their response/assertion logic.
- Resolving unrelated failures that remain after the Keycloak setup is fixed;
  those require a new evidence-based task or an amendment to this plan.

## Open Questions

None for the root fix. If the 16-file regression checkpoint exposes a residual
failure with a different stack trace, implementation stops and the plan is
amended from that new evidence.

