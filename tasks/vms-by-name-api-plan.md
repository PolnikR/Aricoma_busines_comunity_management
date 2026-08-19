# Implementation Plan: `vms_by_name` API/Query Layer

## Overview

Prepare the API client and TanStack Query hook for the new `GET /vms_by_name`
endpoint (already present in the Orval-generated client after the last
`npm run api:update`). This is API/query-layer-only work: no UI component will
call the new hook, and no existing FE behavior changes.

## Architecture Decisions

- Follow the existing `discovery-inventory/resources` API pattern used by
  `vmwareTagsApi.ts` / `useVmwareTags.ts` (single-purpose endpoint, generated
  Orval function + zod schema, parsed via `parseGeneratedResponse`, wrapped in
  a small `fetchX` function that rethrows `OrvalApiError` as a message error).
- Place the new files next to the sibling vCenter-inventory API modules:
  `src/features/discovery-inventory/resources/api/vmsByNameApi.ts` and
  `src/features/discovery-inventory/resources/hooks/useVmsByName.ts`.
- Reuse the generated `vmsByNameVmsByNameGet` client function, the
  `VmsByNameVmsByNameGetParams` type, and the `VmsResponse` zod schema
  (already generated — no orval re-run needed).
- Extend the existing `discoveryInventoryKeys` query-key factory in
  `resourceInventoryQueryKeys.ts` with a `vmsByName(prefix?, providerId?)` key,
  mirroring the existing `inventory`/`vdisksByVm` key shape.
- The hook returns the raw parsed `VmsResponseOutput` (count + vms[]) — no
  domain mapping — since there is no consumer yet and the requirement is to
  stay close to the generated request/response contract.
- Do not touch `RecoveryGroupResourcesStep`, `VmwareResourcesPage`, or any
  other consumer — this is additive only.

## Task List

### Phase 1: API + Query layer

- [ ] Task 1: Add `vmsByName` query key to `resourceInventoryQueryKeys.ts`
- [ ] Task 2: Add `fetchVmsByName` API client wrapper (`vmsByNameApi.ts`) + unit tests
- [ ] Task 3: Add `useVmsByName` TanStack Query hook (`useVmsByName.ts`) + unit tests

### Checkpoint: Complete

- [ ] Focused tests pass for the 3 new/changed files
- [ ] Typecheck passes
- [ ] Lint passes on changed files
- [ ] No existing file's runtime behavior changed (only additive query-key entry)
- [ ] Grep confirms the new hook/api is not imported by any component

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Accidentally wiring the hook into a component | Violates "no UI integration" requirement | Do not touch any `components/` or `pages/` file; verify with grep before finishing |
| Query key collision/inconsistency with existing keys | Cache confusion later | Follow existing `discoveryInventoryKeys` shape exactly (array tuple, `?? null` for optional segments) |

## Open Questions

None — pattern and generated types already exist in the codebase.
