# Implementation Plan: React Router 8.3 Migration

## Overview

Migrate the client application from the `react-router-dom` compatibility
package on React Router 7.18.2 to a direct `react-router@8.3.0` dependency while
preserving existing client-side routing behavior.

## Architecture Decisions

- Convert imports while still on v7, then upgrade the package. This separates
  import conversion failures from v8 compatibility failures.
- Import `RouterProvider` from `react-router/dom` and all other router APIs from
  `react-router`, following the v8 package boundary.
- Standardize local and Docker development on Node 22.23.1 and declare
  `>=22.22.0` as the package engine requirement.
- Keep the migration free of unrelated routing or application behavior changes.

## Dependency Order

```text
Baseline verification
        |
Import and mock conversion on v7
        |
React Router 8.3 package migration
        |
Automated and browser verification
        |
Migration documentation
```

## Tasks

### Task 1: Establish the v7 baseline

**Description:** Verify the current application before changing imports or
dependencies so pre-existing failures can be distinguished from regressions.

**Acceptance criteria:**

- [ ] Node 22.23.x and npm are available to the project shell.
- [ ] Dependencies install from the current lockfile.
- [ ] The existing full build result is recorded.

**Verification:**

- [ ] `node --version`
- [ ] `npm ci`
- [ ] `npm run build`

**Dependencies:** None

**Files likely touched:** None

**Estimated scope:** XS

### Task 2: Convert production router imports

**Description:** Move runtime imports to their React Router v8-compatible entry
points while remaining on v7.

**Acceptance criteria:**

- [ ] `RouterProvider` comes from `react-router/dom`.
- [ ] All other production router APIs come from `react-router`.
- [ ] No production source imports `react-router-dom`.

**Verification:**

- [ ] `rg -n "react-router-dom" src` contains only test references.
- [ ] `npm run typecheck`

**Dependencies:** Task 1

**Files likely touched:** Production `.ts` and `.tsx` files currently importing
`react-router-dom`.

**Estimated scope:** M, applied as a mechanical import migration.

### Task 3: Convert router test imports and mocks

**Description:** Update test wrappers, Vitest mocks, and dynamic import types to
use the new package entry points.

**Acceptance criteria:**

- [ ] Test router components import from `react-router`.
- [ ] Vitest mocks target `react-router`.
- [ ] No source or test file references `react-router-dom`.

**Verification:**

- [ ] `rg -n "react-router-dom" src` returns no matches.
- [ ] `npm run test`

**Dependencies:** Task 2

**Files likely touched:** Test `.ts` and `.tsx` files currently referencing
`react-router-dom`.

**Estimated scope:** M, applied as a mechanical mock/import migration.

## Checkpoint: v8-compatible imports on v7

- [ ] `npm run build` passes before the package major-version change.

### Task 4: Upgrade the package and Node metadata

**Description:** Replace the compatibility package with React Router 8.3.0 and
make the required Node baseline explicit.

**Acceptance criteria:**

- [ ] `react-router-dom` is removed from dependencies and the lockfile.
- [ ] Direct dependency `react-router` resolves to 8.3.0.
- [ ] `.nvmrc` contains `22.23.1` and `engines.node` is `>=22.22.0`.

**Verification:**

- [ ] `npm ls react-router react-router-dom`
- [ ] `npm ci`

**Dependencies:** Task 3 and the import checkpoint

**Files likely touched:** `package.json`, `package-lock.json`, `.nvmrc`

**Estimated scope:** S

### Task 5: Verify routing behavior

**Description:** Run automated checks and a focused browser smoke test across
the routing paths most exposed to regressions.

**Acceptance criteria:**

- [ ] Lint, typecheck, tests, and production build pass.
- [ ] Nested routes, navigation history, dynamic parameters, query parameters,
      and unsaved-change blocking behave as before.
- [ ] Audit status is recorded without forced dependency changes.

**Verification:**

- [ ] `npm run build`
- [ ] `npm audit`
- [ ] Browser smoke test defined in the approved design

**Dependencies:** Task 4

**Files likely touched:** Only focused tests if a real coverage gap is found.

**Estimated scope:** S-M

### Task 6: Update migration documentation

**Description:** Replace the prospective migration notes with the completed
scope, actual verification results, and any residual risks.

**Acceptance criteria:**

- [ ] Notes identify the actual migrated file count and package versions.
- [ ] Notes record Node requirements and verification outcomes.
- [ ] No obsolete recommendation to defer this completed migration remains.

**Verification:**

- [ ] Documentation matches `package.json`, lockfile, and source searches.

**Dependencies:** Task 5

**Files likely touched:** `docs/react-router-update/migration-notes.md`

**Estimated scope:** XS

## Checkpoint: Complete

- [ ] No `react-router-dom` references remain outside historical design records.
- [ ] All automated checks pass on Node 22.23.x.
- [ ] Browser smoke tests pass.
- [ ] Documentation reflects the completed state.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stale project shell cannot see the newly installed Node | Medium | Resolve or restart the shell before dependency changes. |
| Missed Vitest mocks | Medium | Search all `src` references before uninstalling the old package. |
| v8 behavior change | Medium | Preserve a passing v7 import checkpoint and run focused browser checks. |
| Path-parameter encoding differs in 8.3 | Low | Exercise dynamic routes and add a focused test only if relevant values exist. |
| Unrelated dirty worktree content | Low | Leave `.claude/` untouched and review scoped diffs. |

## Open Questions

None. The target version, Node baseline, package boundaries, and verification
scope are approved.
