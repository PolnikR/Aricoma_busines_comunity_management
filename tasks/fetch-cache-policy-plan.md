# Implementation Plan: Unified Fetch and Cache Policy

## Overview

Unify the frontend's TanStack Query cache behavior without introducing global
polling or changing backend contracts. The work first establishes one cache
contract per data class, then removes confirmed query-key/data-shape collisions,
aligns feature hooks with the shared policy, and adds polling only for active
orchestrator runs. Manual refresh and mutation-driven cache synchronization
remain explicit.

The current `tasks/plan.md` and `tasks/todo.md` describe a separate active task,
so this plan uses topic-specific files to preserve that work.

## Goals

- Every query key identifies exactly one canonical data shape and operation.
- Concurrent consumers of the same server data share one in-flight request and
  one cache entry.
- Cache lifetimes and refresh triggers are explicit and consistent by data
  class.
- Only live, non-terminal orchestrator state polls automatically.
- Mutations leave every affected list/detail query synchronized.
- Existing loading, stale-data, retry, and manual-refresh behavior remains
  user-visible and testable.

## Non-goals

- No backend, OpenAPI, service-worker, or persistent API-cache work.
- No global `refetchInterval` for providers, policies, credentials, or discovery
  inventory.
- No speculative merging of queries that return different representations.
- No unrelated UI refactoring.

## Architecture Decisions

- Keep one application-wide `QueryClient`, but move its construction and cache
  profile constants into testable shared modules.
- Use three explicit profiles:
  - reference/configuration data: 15-minute freshness, one retry, no focus
    refetch;
  - discovery inventory: 15-minute freshness, 60-minute garbage collection,
    one retry, no focus refetch;
  - live orchestrator state: 60-second freshness, 5-minute garbage collection,
    one retry, 15-second polling only while the returned run is non-terminal.
- Keep credentials at their current shorter five-minute freshness because they
  are security-sensitive and can change independently.
- Treat query keys as typed cache contracts. Two query functions may share a
  key only when they return the same canonical data shape.
- Preserve manual `refetch()` as an unconditional user-triggered refresh.
- Prefer `setQueryData` when a successful mutation returns the complete
  canonical result; otherwise invalidate the narrowest affected key prefix.
- Do not add API browser-cache headers in this change. TanStack Query remains
  the application data-cache owner.

## Dependency Graph

```text
Baseline cache-contract tests and request-count audit
                         |
                         v
Shared cache profiles + testable QueryClient factory
                         |
             +-----------+------------+
             |                        |
             v                        v
VM name key/type collision       Feature policy adoption
             |                        |
             +-----------+------------+
                         v
Mutation synchronization audit and fixes
                         |
                         v
Conditional live-run polling
                         |
                         v
Documentation and focused verification
```

## Task 1: Lock down current cache contracts and request counts

**Description:** Add focused regression coverage for cache identity before
changing production code. Prove that equal keys deduplicate concurrent fetches,
different provider/filter inputs remain isolated, and expose the existing
`vmsByName` key collision where raw API data and mapped inventory data use the
same cache entry.

**Acceptance criteria:**

- [ ] A test demonstrates one network request for two concurrent consumers of
      the same canonical query.
- [ ] Provider, role, tag, prefix, pagination, and view parameters that affect
      server results are represented in their owning query keys.
- [ ] A regression test fails when one key can contain both raw `VmsResponse`
      and mapped `DiscoveryInventory` data.

**Verification:**

- [ ] Run focused query-key and hook tests with `npm exec vitest run` and the
      explicit affected test paths.
- [ ] Record the before-change request count and failing collision assertion in
      the implementation notes or commit message.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts`
- `src/features/discovery-inventory/resources/hooks/useVmsByName.test.tsx`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Estimated scope:** Medium (3 files)

## Task 2: Introduce shared cache profiles and a QueryClient factory

**Description:** Extract named cache profiles and QueryClient creation from the
React provider. Keep the current 15-minute application default while making
focus behavior, retry count, inventory retention, and live-run timing explicit
and independently testable.

**Acceptance criteria:**

- [ ] Shared constants/options define reference, discovery, credentials, and
      live-run policies with the values listed in Architecture Decisions.
- [ ] `AppProviders` uses one module-level client created through the shared
      factory; application behavior remains unchanged except for the explicitly
      standardized focus policy.
- [ ] Tests assert the effective default options and protect durations from
      accidental unit mistakes.

**Verification:**

- [ ] `npm exec vitest run src/app/providers.test.tsx src/shared/query/cachePolicy.test.ts`
- [ ] `npm exec eslint src/app/providers.tsx src/app/providers.test.tsx src/shared/query/cachePolicy.ts src/shared/query/cachePolicy.test.ts`

**Dependencies:** Task 1

**Files likely touched:**

- `src/shared/query/cachePolicy.ts`
- `src/shared/query/cachePolicy.test.ts`
- `src/app/providers.tsx`
- `src/app/providers.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 3: Resolve the VMware name-search cache collision

**Description:** Make `vmsByName` have one owner and one cached data shape. The
current standalone `useVmsByName` has no production consumer, while
`useVmwareResourceInventory` caches mapped inventory under the same key. Remove
the unused standalone hook and its test unless a new production consumer is
found at implementation time; otherwise give the raw operation a distinct key
and contract. Keep the mapped inventory hook canonical for the current UI.

**Acceptance criteria:**

- [ ] No query key can hold both raw generated API output and mapped discovery
      inventory.
- [ ] Two mounted VMware name-search consumers with the same prefix/provider
      cause one request and receive the same mapped shape.
- [ ] Debounce, `keepPreviousData`, tag-plus-name local filtering, retry, and
      empty-result behavior remain unchanged.

**Verification:**

- [ ] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts`
- [ ] `rg -n "useVmsByName|vmsByName" src` confirms one intentional cache
      contract and no orphaned imports.
- [ ] Focused ESLint for changed files.

**Dependencies:** Tasks 1-2

**Files likely touched:**

- `src/features/discovery-inventory/resources/hooks/useVmsByName.ts`
- `src/features/discovery-inventory/resources/hooks/useVmsByName.test.tsx`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.ts`

**Estimated scope:** Medium (up to 5 files)

## Checkpoint: Cache identity foundation

- [ ] Tasks 1-3 focused tests pass together.
- [ ] Equal keys mean equal operation, parameters, and data shape.
- [ ] Concurrent equal queries produce one network request.
- [ ] Typecheck and focused lint pass for changed files.
- [ ] Review the cache profiles and canonical VMware shape before broad adoption.

## Task 4: Apply the discovery profile to inventory query slices

**Description:** Replace repeated discovery timing/retry/focus literals with
the shared discovery profile in small slices. Start with VMware/resource hooks,
then infrastructure/recovery-group consumers that already share canonical
`discoveryInventoryKeys`. Do not change query keys or endpoint selection in
this task.

**Acceptance criteria:**

- [ ] All discovery inventory queries use the same 15-minute stale and
      60-minute garbage-collection policy.
- [ ] Resources, Infrastructure, and Recovery Group consumers sharing the same
      canonical key deduplicate requests and reuse fresh cache data.
- [ ] Disabled/provider-gated queries remain idle and manual refresh still
      forces a request.

**Verification:**

- [ ] Run the focused hook tests for every changed discovery hook.
- [ ] Add or retain request-count assertions for cross-consumer cache reuse.
- [ ] Run focused ESLint for changed files.

**Dependencies:** Tasks 2-3

**Files likely touched per slice:**

- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- `src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.ts`
- `src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts`
- Corresponding focused test files, split into separate commits if the write
  set would exceed five files.

**Estimated scope:** Medium per slice (3-5 files)

## Task 5: Apply the reference policy to non-live feature queries

**Description:** Standardize providers, platform providers, recovery
applications/groups, policy lists, and similar reference queries. Remove local
options that merely duplicate the shared profile, but keep genuine exceptions
such as credentials' five-minute freshness and recovery groups' disabled retry
behavior when required by their error contract.

**Acceptance criteria:**

- [ ] Every non-live query either inherits the reference profile or documents
      an explicit exception beside the override.
- [ ] Window focus does not unexpectedly refetch reference data; manual refresh
      remains available.
- [ ] Query keys and returned feature models remain unchanged.

**Verification:**

- [ ] Run focused hook tests grouped by feature, not the complete suite.
- [ ] Tests assert effective exceptions for credentials and recovery groups.
- [ ] Run focused ESLint after each feature slice.

**Dependencies:** Task 2

**Files likely touched per slice:**

- `src/features/providers-connectors/providers/hooks/useProviders.ts`
- `src/features/platform-administration/platform-providers/hooks/usePlatformProviders.ts`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.ts`
- Relevant policy/recovery hook and test files, limited to five files per
  implementation slice.

**Estimated scope:** Medium per slice (3-5 files)

## Task 6: Make mutation cache synchronization explicit

**Description:** Audit each create/update/delete mutation against the query
keys consumed by its list and detail screens. Add focused tests first, then use
`setQueryData` for complete canonical mutation responses or narrow prefix
invalidation when the response is incomplete. Avoid broad application-wide
invalidations.

**Acceptance criteria:**

- [ ] Every mutation identifies and synchronizes all affected cache entries.
- [ ] Role/parameter-specific provider lists cannot remain fresh-but-stale
      after provider mutations.
- [ ] A failed mutation leaves existing cache data unchanged.

**Verification:**

- [ ] Focused mutation-hook tests assert exact `setQueryData` or
      `invalidateQueries` keys and post-success cache contents.
- [ ] Focused page/hook test proves the changed list is visible without a hard
      reload.
- [ ] Run focused ESLint for changed mutation files and tests.

**Dependencies:** Tasks 3-5

**Files likely touched per feature slice:**

- Provider/platform-provider mutation hooks and tests.
- Recovery application/group mutation hooks and tests.
- Policy mutation hooks and tests.

**Estimated scope:** Medium per slice (2-4 files)

## Checkpoint: Consistent non-live data behavior

- [ ] Tasks 4-6 focused tests pass together by affected feature.
- [ ] No confirmed duplicate request remains for equal canonical data.
- [ ] Reference and discovery queries follow their declared profiles.
- [ ] Successful mutations update or invalidate every affected query.
- [ ] Typecheck and focused lint pass.

## Task 7: Add conditional polling for active orchestrator runs

**Description:** Add a shared live-run policy to latest-run queries. Poll every
15 seconds only while a run is present and non-terminal; stop for completed,
failed, cancelled, or missing runs and when the query is disabled/unmounted.
Keep history pagination manual/cached unless a separate active-run requirement
is proven.

**Acceptance criteria:**

- [ ] An active run refetches at 15-second intervals using one timer per unique
      query key.
- [ ] Polling stops immediately after a terminal response and does not run for
      disabled or unmounted queries.
- [ ] Manual refresh, retry, one-minute freshness, and five-minute garbage
      collection remain available independently of polling.

**Verification:**

- [ ] Fake-timer tests cover active-to-active, active-to-terminal, error,
      disabled, and unmount transitions with exact request counts.
- [ ] Run focused latest-run/entity-run hook tests.
- [ ] Browser network check confirms polling only on the visible live-run flow.

**Dependencies:** Tasks 2 and 6

**Files likely touched:**

- `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.ts`
- Their corresponding focused test files.
- `src/shared/query/cachePolicy.ts`

**Estimated scope:** Medium (up to 5 files)

## Task 8: Document and verify the final policy

**Description:** Replace the obsolete unified-VM narrative with documentation
that matches the implemented query keys, canonical data shapes, profiles,
invalidation rules, manual refresh, and conditional polling. Run the smallest
combined verification set that proves all changed contracts.

**Acceptance criteria:**

- [ ] Documentation lists each cache profile, owner, key factory, refresh
      trigger, and invalidation strategy.
- [ ] Historical references to a nonexistent `['virtual-machines-unified']`
      query are removed or clearly marked historical.
- [ ] The final diff contains only cache/fetch-policy work and its tests/docs.

**Verification:**

- [ ] Run all directly affected Vitest files explicitly.
- [ ] `npm run typecheck`
- [ ] Run ESLint only on changed TypeScript/TSX files.
- [ ] `git diff --check`
- [ ] Inspect `git diff --stat` and `git status --short`.
- [ ] Record explicitly that the complete suite/build was not run unless the
      implementation becomes cross-cutting enough to require it.

**Dependencies:** Tasks 1-7

**Files likely touched:**

- `docs/superpowers/CACHING_STRATEGY.md` or the repository's chosen current
  cache-strategy document.
- `ANALYSIS_VM_CACHING.md`

**Estimated scope:** Small (2 documentation files plus verification)

## Final Checkpoint

- [ ] One query key always maps to one canonical operation and data shape.
- [ ] Equal concurrent queries deduplicate to one request.
- [ ] Discovery data uses 15-minute freshness and 60-minute retention.
- [ ] Reference/configuration data follows the shared reference policy.
- [ ] Credentials retain their explicit five-minute exception.
- [ ] Only active live runs poll, every 15 seconds, and terminal runs stop.
- [ ] Mutations synchronize all affected caches without broad invalidation.
- [ ] Manual refresh still forces an immediate request.
- [ ] Focused tests, typecheck, focused lint, and diff checks pass.
- [ ] Only in-scope files are committed atomically.

## Parallelization Opportunities

- Tasks 1-3 are sequential because they establish the cache contract.
- After Task 3, Tasks 4 and 5 can run in parallel when their file sets do not
  overlap.
- Task 6 follows the key/policy work and should be split by feature; independent
  feature slices can run in parallel.
- Task 7 can run in parallel with late Task 6 feature slices after the shared
  live policy is stable.
- Task 8 is sequential final verification and documentation.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Same key stores incompatible data shapes | High | Contract test before refactor; one canonical owner per key |
| Broad policy change causes request storms | High | No global polling; focused request-count tests |
| Polling continues after terminal state | High | Function-based interval plus fake-timer terminal tests |
| Mutation invalidates too broadly or narrowly | High | Exact-key assertions and post-mutation cache tests |
| Fresh cache hides server-side changes too long | Medium | Manual refresh, mutation invalidation, and polling only for live data |
| Removing local options changes an intentional exception | Medium | Record and test every retained override before cleanup |
| Documentation drifts again | Medium | Document key owners/profiles next to shared policy names |

## Open Questions

None required to start. The proposed active-run polling interval is 15 seconds;
it is a named constant and can be changed later from operational evidence.
