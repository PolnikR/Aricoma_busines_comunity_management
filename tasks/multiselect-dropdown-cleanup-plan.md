# Implementation Plan: Remove Orphaned MultiSelectDropdown

## Overview

Remove the now-unused shared `MultiSelectDropdown` component and its dedicated test after provider and platform-provider VM tag inputs moved to the shared single-select `Select` control. The cleanup is intentionally narrow: no provider behavior, API contract, OpenAPI model, or historical design/spec document will be changed as part of this task.

## Architecture Decisions

- Delete the orphaned component rather than keep an unused abstraction with no production consumer.
- Delete the component-specific test together with the component; the active single-select behavior remains covered by provider/platform-provider form and modal tests.
- Do not rewrite historical specs or completed task plans that describe why `MultiSelectDropdown` existed at the time; they are historical records, not active runtime dependencies.
- Before deletion, verify repository-wide that no production import or indirect barrel export references `MultiSelectDropdown`.

## Dependency Graph

```text
Confirm zero runtime references
          |
          v
Delete component + dedicated test
          |
          v
Focused verification + reference scan
```

## Task 1: Confirm the component is truly orphaned

**Description:** Re-scan the repository for `MultiSelectDropdown` imports/usages and inspect shared form exports so deletion cannot break an indirect consumer.

**Acceptance criteria:**
- [ ] No production TS/TSX file imports or renders `MultiSelectDropdown`.
- [ ] No barrel/export file re-exports it for an external in-repository consumer.
- [ ] Remaining textual references are historical documentation/task-plan references only.

**Verification:**
- [ ] Repository-wide text search for `MultiSelectDropdown` is reviewed before deletion.
- [ ] Any active runtime reference found stops the cleanup until its ownership is resolved.

**Dependencies:** None

**Files likely touched:** None (read-only discovery)

**Estimated scope:** XS

## Task 2: Remove the orphaned component and dedicated test

**Description:** Delete `MultiSelectDropdown.tsx` and its component-specific test. Do not alter provider single-select behavior or introduce a replacement abstraction.

**Acceptance criteria:**
- [ ] `MultiSelectDropdown.tsx` is removed.
- [ ] `MultiSelectDropdown.test.tsx` is removed.
- [ ] No production behavior changes outside removal of unreachable code.

**Verification:**
- [ ] Repository-wide search returns no active source import/render of `MultiSelectDropdown`.
- [ ] Focused provider/platform-provider tests that replaced this component remain green.

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/components/form/MultiSelectDropdown.tsx`
- `src/shared/components/form/MultiSelectDropdown.test.tsx`

**Estimated scope:** Small (2 files)

## Checkpoint: Cleanup complete

- [ ] No runtime references to `MultiSelectDropdown` remain.
- [ ] Provider and platform-provider single-select regression tests pass.
- [ ] Focused ESLint/typecheck are clean for the affected dependency boundary.
- [ ] `git diff --check` passes.
- [ ] Only the two orphaned files are deleted; unrelated historical docs/plans remain untouched.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hidden barrel or indirect import exists | Medium | Complete repository-wide reference scan before deletion. |
| Tests accidentally relied on component-specific behavior | Low | Run current provider/platform-provider single-select regression tests after deletion. |
| Cleanup expands into historical documentation rewrite | Low | Treat dated specs and completed task plans as historical records and leave them unchanged. |

## Open Questions

None. Current repository evidence shows no production consumer of `MultiSelectDropdown`; implementation should remain a narrow dead-code deletion after one final reference scan.
