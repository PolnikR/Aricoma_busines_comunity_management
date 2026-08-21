# Todo: Unified Fetch and Cache Policy

## Phase 1: Cache identity foundation

- [ ] Task 1: Lock down cache contracts and baseline request counts.
- [ ] Task 2: Introduce shared cache profiles and a QueryClient factory.
- [ ] Task 3: Resolve the VMware name-search key/data-shape collision.

## Checkpoint: Cache identity

- [ ] Equal keys represent the same operation, parameters, and data shape.
- [ ] Concurrent equal queries produce one request.
- [ ] VMware debounce, previous-data, retry, and empty states still pass.
- [ ] Focused tests, typecheck, and focused lint pass.
- [ ] Review and approve the cache profiles before broad adoption.

## Phase 2: Policy adoption and mutation synchronization

- [ ] Task 4: Apply the discovery profile in small inventory slices.
- [ ] Task 5: Apply the reference policy in small non-live feature slices.
- [ ] Task 6: Audit and fix mutation cache synchronization by feature.

## Checkpoint: Non-live data

- [ ] Discovery queries use 15-minute freshness and 60-minute retention.
- [ ] Reference queries follow the shared policy or a tested exception.
- [ ] Credentials keep the explicit five-minute freshness exception.
- [ ] Successful mutations update or invalidate every affected query.
- [ ] Manual refresh forces an immediate request.
- [ ] Focused tests, typecheck, and focused lint pass.

## Phase 3: Live data refresh

- [ ] Task 7: Poll active orchestrator runs every 15 seconds.

## Checkpoint: Polling

- [ ] Active runs poll with exact request counts.
- [ ] Completed, failed, cancelled, missing, disabled, and unmounted runs do not poll.
- [ ] Browser network verification shows no polling on reference/inventory pages.

## Phase 4: Documentation and final verification

- [ ] Task 8: Document the implemented cache contract and remove stale guidance.
- [ ] Run every directly affected Vitest file explicitly.
- [ ] Run `npm run typecheck`.
- [ ] Run ESLint only for changed TypeScript/TSX files.
- [ ] Run `git diff --check` and inspect diff/status.
- [ ] Commit only in-scope files atomically.

## Final Review Gate

- [ ] Human has reviewed and approved this plan before implementation begins.
