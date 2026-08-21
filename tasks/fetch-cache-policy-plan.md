# Implementation Plan: Production Fetch and Cache Policy

## Overview

Standardize TanStack Query behavior across the whole solution around one production policy rather than page-specific combinations of `staleTime`, `gcTime`, focus behavior, and polling. All normal server data uses the same 15-minute automatic refresh cycle and 60-minute inactive retention. The only timing exception is a faster conditional interval for an actively changing Recovery Run.

`staleTime` remains a freshness rule, not a timer, so the standard policy pairs it with `refetchInterval`. While a query is mounted in a visible tab, the interval triggers a background request every 15 minutes. Existing cached data remains rendered during that request; success atomically replaces it, while failure keeps it visible and surfaces a non-blocking refresh error. Blocking skeletons are reserved for queries that have no usable data for the current key.

The current `tasks/plan.md` and `tasks/todo.md` belong to another task, so this work remains in the existing topic-specific files:

- `tasks/fetch-cache-policy-plan.md`
- `tasks/fetch-cache-policy-todo.md`

## Goals

- Define one production cache policy for all normal server data and one explicit live-run exception.
- Ensure the same query key always has the same data shape and cache policy regardless of consumer.
- Remove the current `staleTime 15 min / default gcTime ~5 min` mismatch where longer retention is expected.
- Keep Resources/Infrastructure data visible during stale background refetch instead of showing a blocking skeleton when cache exists.
- Align Providers retention with Resources so a normal route return does not lose provider prerequisites before inventory cache expires.
- Automatically refresh mounted normal queries every 15 minutes without polling hidden tabs.
- Poll only active Recovery Runs more frequently than the standard 15-minute cycle.
- Keep mutation-driven cache synchronization explicit and narrow.
- Make refresh triggers explicit and testable.

## Non-goals

- No backend or OpenAPI contract changes.
- No service worker, IndexedDB, persistent TanStack Query cache, or cross-browser-session API cache.
- No independently chosen per-feature refresh intervals or cache lifetimes.
- No unrelated UI or architecture refactoring.
- No change to HTTP `/api` caching in nginx as part of this work.
- No persistent cache across a hard browser refresh; this plan standardizes the existing in-memory application cache.

## Core Semantics

### `staleTime`

`staleTime` answers only: **how long is successfully fetched data considered fresh?**

Example with `staleTime = 15 min`:

```text
fetch succeeds
    |
    +-- 0-15 min: FRESH
    |
    +-- after 15 min: STALE
```

Crossing the 15-minute boundary does **not** itself send a request.

### `gcTime`

`gcTime` answers: **how long may an inactive query remain in memory after it has no observers?**

It is independent of `staleTime`.

### Stale-while-revalidate

For normal data, when a background refresh starts and cached data still exists:

```text
stale cached data exists
        |
        +--> render cached data immediately
        |
        +--> background refetch starts
                    |
                    +--> isFetching = true / Updating...
                    |
                    +--> success replaces cached data
```

A stale background refetch must not cause a blocking skeleton solely because `isFetching` is true.

### Polling

Polling is an independent timer-driven refresh mechanism (`refetchInterval`). It does not wait for `staleTime` to expire. The standard policy uses a 15-minute interval for every mounted normal query; active Recovery Runs use a faster conditional interval.

## Production Cache Profiles

### 1. Standard query policy

This is the application default and the mandatory policy for Discovery inventory, Providers, Platform Providers, Credentials, Policies, Recovery Applications, Recovery Groups, Tags, lookup data, and Recovery Run history.

```text
staleTime: 15 min
gcTime: 60 min
retry: 1
refetchOnWindowFocus: true (only stale queries refetch)
refetchOnMount: true (only stale queries refetch)
refetchOnReconnect: true
refetchInterval: 15 min
refetchIntervalInBackground: false
```

Expected behavior:

```text
initial request without cached data
-> blocking loading/skeleton is allowed

mounted visible query reaches 15 minutes
-> old data remains rendered
-> non-blocking Updating... state
-> background request
-> success replaces old data with new data
-> failure keeps old data and exposes a refresh warning/retry

return while fresh
-> cached data immediately
-> no request

return/focus/reconnect while stale but retained
-> cached data immediately
-> background request using the same stale-while-revalidate contract

return after 60-minute inactive retention elapsed
-> no cached data remains
-> blocking initial loading is allowed
```

`refetchIntervalInBackground: false` prevents hidden tabs from generating periodic traffic. If the tab becomes visible after the query is stale, `refetchOnWindowFocus: true` performs one catch-up background refresh.

### 2. Active Recovery Run policy

This is the only refresh-timing exception. It applies to the canonical latest-run key only while its returned run is explicitly non-terminal.

```text
staleTime: 15 s
gcTime: 60 min
retry: 1
refetchOnWindowFocus: true
refetchOnMount: true
refetchOnReconnect: true
refetchInterval: 15 s while latest run is non-terminal; otherwise 15 min
refetchIntervalInBackground: false
```

Polling rules:

```text
queued / running / other canonical non-terminal status
-> refresh every 15 s while mounted and visible

terminal or no-run response
-> stop fast polling
-> use the standard 15-minute policy

query disabled, unmounted, or browser tab hidden
-> no interval request
```

The terminal-status set must come from the canonical Recovery Run status model, not be duplicated in components.

## Query-Key Contract Rules

1. One query key = one operation + one canonical returned data shape + one cache policy.
2. If server parameters change the response, the parameters must be represented in the query key.
3. Two consumers of the same canonical server data must reuse the same key factory rather than inventing parallel keys.
4. Two queries returning different shapes must not share one key even if they call related endpoints.
5. Cache policy must live with the query/domain definition, not be redefined differently by individual components.

Known issue to resolve: `vmsByName` is used by a raw-response hook and by mapped VMware inventory behavior under the same key family. The implementation must establish one canonical owner/shape or split the keys intentionally.

Known policy inconsistencies to remove:

- Providers currently inherit default inactive GC while Resources inventory uses 60-minute GC.
- `vdisks` consumers currently use the same key family with different GC policies.
- `vms-by-name` consumers currently use the same key family with different policies and data shapes.
- `recovery-runs/latest` currently has different freshness policies depending on consumer.
- Recovery Applications and VMware Tags currently differ from most features in window-focus refetch behavior.

## UI Loading Contract

For every stale-while-revalidate screen:

```text
NO usable cached data for current query key
-> blocking skeleton/loading state

cached data exists + background request running
-> keep cached content rendered
-> show non-blocking Updating/fetching indicator

cached data exists + background refresh fails
-> keep cached data when safe
-> surface refresh error/retry according to existing feature error UX
```

Do not use `isFetching` alone as a reason to replace rendered data with a skeleton.

For VMware Resources, preserve the existing `keepPreviousData` behavior where it protects query-key transitions such as provider/filter changes.

## Mutation Cache Synchronization Rules

Use the narrowest reliable strategy after successful mutations:

### Authoritative mutation response

When the backend returns the complete canonical list/data:

```text
mutation success
-> setQueryData(canonicalKey, authoritativeResponse)
```

This is appropriate for patterns already used by Policy Sets and Recovery Policies.

### Incomplete mutation response

When the response does not contain the complete canonical state:

```text
mutation success
-> invalidateQueries(narrowAffectedPrefix)
-> active affected queries refetch
```

Providers must invalidate all relevant role-specific list keys because `all`, `source`, and `target` are separate cache entries.

Recovery Application/Group mutations must keep their list/detail consumers synchronized without broad application-wide invalidation.

Recovery actions that can change latest run state should invalidate/refetch the matching `recovery-runs/latest` key when such an action is part of the current frontend flow.

## Refresh Trigger Policy

Standard queries may refetch from these triggers:

- 15-minute interval while mounted and visible (`refetchInterval`)
- stale query remount (`refetchOnMount`)
- stale browser-tab focus (`refetchOnWindowFocus`)
- network reconnect (`refetchOnReconnect`)
- explicit manual `refetch()` / Refresh button
- mutation-driven invalidation
- query-key change representing different server data

Standard queries must **not** refetch because of:

- an independently chosen local interval
- a hidden-tab interval
- `isFetching` or a component render by itself

Active Recovery Run latest state replaces the standard interval with:

- conditional 15-second polling while the run is non-terminal

## Dependency Graph

```text
Baseline query/key/request-count tests
              |
              v
Standard cache policy + active-run exception
              |
     +--------+---------+
     |                  |
     v                  v
Key/data-shape fixes    Standard policy adoption
     |                  |
     +--------+---------+
              v
Mutation synchronization
              |
              v
Recovery Run conditional polling
              |
              v
Final cache/UI audit + documentation
```

## Task 1: Lock down cache contracts and current request behavior

**Description:** Add focused regression tests before changing production behavior. Capture canonical query keys, response shapes, request deduplication, stale-vs-fetching behavior, and the known same-key inconsistencies.

**Acceptance criteria:**

- [ ] Two concurrent consumers of the same canonical key produce one network request.
- [ ] Provider/filter/pagination/view parameters that change server results are represented in the key.
- [ ] Tests expose any key that can currently hold incompatible response shapes or incompatible cache policies.

**Verification:**

- [ ] Run explicit affected query-key/hook Vitest files with `npm exec vitest run <paths>`.
- [ ] Record baseline request-count expectations in tests rather than relying on manual observation only.

**Dependencies:** None

**Files likely touched:**

- discovery inventory query-key tests
- provider query tests
- recovery-run query tests

**Estimated scope:** Medium per focused slice (3-5 files)

## Task 2: Introduce the standard policy and live-run exception

**Description:** Create named, testable options for the single standard query policy and the conditional active-run exception. Update the application QueryClient defaults so new and migrated queries automatically receive the 15-minute freshness/refresh cycle, 60-minute retention, one retry, stale focus/mount/reconnect refresh, and no hidden-tab interval.

**Acceptance criteria:**

- [ ] Shared constants define the 15-minute standard cycle, 60-minute retention, and 15-second active-run cycle in one module.
- [ ] Global defaults implement the standard policy, including `refetchIntervalInBackground: false`.
- [ ] Tests assert effective timing, focus/mount/reconnect triggers, retry, and hidden-tab behavior.

**Verification:**

- [ ] Focused tests for shared cache-policy module and `AppProviders`.
- [ ] Focused ESLint for changed shared/app files.

**Dependencies:** Task 1

**Files likely touched:**

- `src/shared/query/cachePolicy.ts`
- `src/shared/query/cachePolicy.test.ts`
- `src/app/providers.tsx`
- corresponding provider test if needed

**Estimated scope:** Medium (3-4 files)

## Task 3: Fix query-key ownership and same-key policy inconsistencies

**Description:** Resolve query families whose current consumers disagree on shape or cache policy. Start with `vms-by-name`, then verify `vdisks` and `recovery-runs/latest` have one canonical contract each.

**Acceptance criteria:**

- [ ] `vms-by-name` no longer stores raw and mapped responses under the same key.
- [ ] Every `vdisks` consumer uses the same key definition and standard policy.
- [ ] Every `recovery-runs/latest` consumer uses the same active-run exception.

**Verification:**

- [ ] Focused request-count and data-shape tests for the affected hooks.
- [ ] Repository search confirms no duplicate local timing overrides remain for those key families.
- [ ] Focused ESLint for changed files.

**Dependencies:** Tasks 1-2

**Files likely touched per slice:**

- `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.ts`
- `src/features/discovery-inventory/resources/hooks/useVmsByName.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- corresponding focused tests
- Recovery Run hooks/tests in a separate slice if needed

**Estimated scope:** Medium per slice (3-5 files)

## Task 4: Align Discovery inventory and Providers with the standard policy

**Description:** Apply the standard policy to all canonical inventory consumers and Providers. Preserve cached data across normal route navigation and prove that an open visible Resources/Infrastructure query refreshes automatically after 15 minutes without replacing its content with a blocking loader.

**Acceptance criteria:**

- [ ] Discovery and Providers use the same `15 min stale / 60 min gc / 15 min interval` settings.
- [ ] A visible mounted query performs one automatic refetch at 15 minutes; a hidden tab does not.
- [ ] During interval, focus, reconnect, or stale-remount refetch, cached content remains visible and success replaces it with new data.

**Verification:**

- [ ] Focused hook tests for VMware, FlashSystem, IBM Power, Infrastructure, Recovery Group inventory, and Providers as affected.
- [ ] Add fake-timer and route-remount tests proving exact request counts and stale-while-revalidate rendering.
- [ ] Manual browser Network check for the 15-minute interval, hidden-tab pause, and focus catch-up flow.

**Dependencies:** Tasks 2-3

**Files likely touched per slice:**

- discovery inventory hooks and tests
- `src/features/providers-connectors/providers/hooks/useProviders.ts`
- Resources page/role tests only if needed to prove loading behavior

**Estimated scope:** Medium per slice (3-5 files)

## Task 5: Apply the standard policy to remaining normal queries

**Description:** Migrate Platform Providers, Credentials, Policy Sets, Recovery Policies, Tags, lookup data, and paginated Recovery Run history to the same standard policy. Work in small feature slices and preserve query keys and returned data models.

**Acceptance criteria:**

- [ ] Every migrated normal query uses the shared standard options with no local timing override.
- [ ] A stale focus/reconnect triggers one background refresh; a fresh focus does not.
- [ ] Manual Refresh and mutation synchronization continue to work.

**Verification:**

- [ ] Focused hook tests grouped by feature.
- [ ] Focused ESLint for each changed slice.
- [ ] Search confirms no migrated normal query defines its own `staleTime`, `gcTime`, or `refetchInterval`.

**Dependencies:** Task 2

**Files likely touched per slice:**

- Platform Provider hooks/tests
- Policy Set hooks/tests
- Snapshot/Recovery App/Clean Room policy hooks/tests
- VMware tag/lookup hooks/tests
- Credentials and Recovery Run history hooks/tests

**Estimated scope:** Medium per feature slice (2-5 files)

## Task 6: Apply the standard policy to Recovery Applications and Groups

**Description:** Migrate Recovery Applications and Recovery Groups to the same standard timing and refresh behavior. Preserve only verified semantic exceptions such as an intentionally disabled retry; timing must not vary by feature.

**Acceptance criteria:**

- [ ] Recovery Applications and Groups use `15 min stale / 60 min gc / 15 min interval`.
- [ ] A fresh remount within 15 minutes reuses cache without a request.
- [ ] Interval and stale-remount refreshes keep old data visible until successful replacement.

**Verification:**

- [ ] Focused Recovery Application and Recovery Group hook/page tests.
- [ ] Request-count tests cover fresh remount and stale remount behavior.
- [ ] Focused ESLint.

**Dependencies:** Task 2

**Files likely touched:**

- Recovery Application query hooks/tests
- Recovery Group query hooks/tests

**Estimated scope:** Medium per feature slice (2-4 files)

## Checkpoint: Standard cache behavior

- [ ] Every normal query uses `15 min stale / 60 min gc / 15 min visible interval`.
- [ ] Hidden tabs do not run interval requests; stale focus performs one catch-up refresh.
- [ ] Stale cached data renders while interval/focus/reconnect/remount refetch runs.
- [ ] Successful refetch atomically replaces old data; failed refetch keeps it visible with a non-blocking warning.
- [ ] Blocking skeleton appears only when there is no usable cached data for the current key.
- [ ] Focused tests, typecheck, and focused lint pass for completed slices.

## Task 7: Make mutation cache synchronization explicit

**Description:** Audit create/update/delete/rollback/submit mutations against canonical list/detail keys after the policy/key cleanup. Use authoritative `setQueryData` when the backend returns complete state; otherwise invalidate only the narrow affected key prefix.

**Acceptance criteria:**

- [ ] Provider mutations synchronize `all/source/target` list caches.
- [ ] Policy/Application/Group mutations leave no known fresh-but-outdated cache entry.
- [ ] Failed mutations leave existing cached data intact.

**Verification:**

- [ ] Focused mutation-hook tests assert exact cache writes/invalidations.
- [ ] Focused page/hook test proves updated data appears without hard reload.
- [ ] Focused ESLint.

**Dependencies:** Tasks 3-6

**Files likely touched:**

- mutation hooks and corresponding tests, split by feature

**Estimated scope:** Medium per feature slice (2-4 files)

## Task 8: Standardize Recovery Run live/latest polling

**Description:** Give all `recovery-runs/latest` consumers one canonical contract. Use the 15-second interval while the latest run is explicitly non-terminal, then fall back to the standard 15-minute interval for terminal/no-run state. Disabled, unmounted, and hidden-tab queries must not issue interval requests.

**Acceptance criteria:**

- [ ] Latest-run queries use the canonical active-run exception and 60-minute retention everywhere.
- [ ] A queued/running non-terminal run refreshes every 15 seconds while mounted and visible.
- [ ] Fast polling stops after the first terminal response and returns to the standard cycle; disabled/unmounted/hidden queries do not poll.
- [ ] `refetchIntervalInBackground` is explicitly false.

**Verification:**

- [ ] Fake-timer tests prove exact request counts for active-to-active and active-to-terminal transitions.
- [ ] Tests cover no-run, terminal, disabled, unmount, error/retry, and remount cases.
- [ ] Browser Network verification confirms polling exists only on live/latest run flows.

**Dependencies:** Tasks 2-3 and 7

**Files likely touched:**

- `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.ts`
- shared recovery-run status helper if one does not already exist
- focused tests

**Estimated scope:** Medium (3-5 files)

## Task 9: Standardize background-refresh presentation

**Description:** Apply one stale-while-revalidate presentation contract across representative table, inventory, detail, and builder screens. Initial loading may block only without usable data. Every background refresh keeps existing content mounted, exposes a small updating indicator, replaces data only on success, and retains stale data with a non-blocking retryable warning on failure.

**Acceptance criteria:**

- [ ] `isFetching && data` never selects a blocking skeleton or full-page error state.
- [ ] Successful background refresh replaces the visible old dataset without remounting the page controls.
- [ ] Failed background refresh preserves old data and exposes the existing stale-data error/retry UX.

**Verification:**

- [ ] Focused component/page tests cover initial load, background success, and background failure with cached data.
- [ ] Tests assert DOM continuity for controls whose state/focus must survive refresh.
- [ ] Focused ESLint.

**Dependencies:** Tasks 4-6 and 8

**Files likely touched:**

- shared fetch/error/loading presentation components where already established
- representative Resources, Recovery, and administration pages/tests, split into slices of at most five files

**Estimated scope:** Medium per UI slice (2-5 files)

## Task 10: Final cache/UI audit and documentation

**Description:** Audit all production TanStack queries against the standard policy and active-run exception, remove obsolete local timing literals, document intentional semantic exceptions, and verify the UI loading contract across representative stale-while-revalidate and live-polling flows.

**Acceptance criteria:**

- [ ] Every normal production query uses the standard policy; latest active runs use the single timing exception.
- [ ] Same-key consumers have one canonical data shape and policy.
- [ ] Every normal production query receives the standard interval and no feature defines an arbitrary timing override.
- [ ] Cache strategy documentation matches implemented values and triggers.

**Verification:**

- [ ] Run all directly affected Vitest files explicitly.
- [ ] `npm run typecheck`.
- [ ] Run ESLint only for changed TypeScript/TSX files.
- [ ] `git diff --check`.
- [ ] Inspect `git diff --stat` and `git status --short` to ensure unrelated pre-existing work is not included.
- [ ] Do not run the complete suite/build unless implementation evidence shows the cross-cutting change requires it or the user requests it.

**Dependencies:** Tasks 1-9

**Files likely touched:**

- shared cache-strategy documentation
- only cache/query files identified by the final audit

**Estimated scope:** Medium, split if more than five production files need changes

## Final Checkpoint

- [ ] All normal queries = `15 min stale / 60 min gc / 15 min visible interval`.
- [ ] Stale focus/mount/reconnect performs background refresh; fresh focus/mount does not.
- [ ] Active Recovery latest = conditional 15-second visible interval, then standard cycle when terminal/no-run.
- [ ] Hidden tabs do not issue interval requests.
- [ ] Same key = same operation, data shape, and cache policy.
- [ ] Cached stale data stays visible during background refetch.
- [ ] Blocking skeleton is reserved for missing usable cache.
- [ ] Mutation synchronization is explicit and narrow.
- [ ] Manual Refresh always remains available.
- [ ] Focused tests, typecheck, focused lint, and diff checks pass.

## Parallelization Opportunities

- Tasks 1-3 are sequential because they define cache contracts and shared policy.
- After Task 3, Tasks 4, 5, and 6 can be implemented in parallel when their file sets do not overlap.
- Task 7 follows domain/key adoption so invalidation is written against stable contracts.
- Tasks 8 and 9 may proceed in parallel after Tasks 4-7 because polling logic and shared background-refresh UI have separate primary write sets.
- Task 10 is final and sequential.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Same key stores incompatible response shapes | High | Contract tests; one canonical key owner/data shape |
| Cache retention is shorter than freshness/navigation requirement | High | One tested standard policy with explicit `staleTime` and `gcTime` |
| Resources still skeleton on normal stale return | High | Align Providers to `15/60`; route remount regression test |
| Standard interval creates request storms | High | 15-minute cadence, hidden-tab pause, deduplication, exact request-count tests |
| Recovery polling continues after terminal state | High | Function-based interval and fake-timer terminal tests |
| Polling runs in hidden browser tabs | Medium | Explicit `refetchIntervalInBackground: false` |
| Mutations leave fresh-but-outdated caches | High | Exact key-prefix tests after every mutation strategy |
| Focus and interval race into duplicate requests | Medium | TanStack Query deduplication plus fake-timer/focus request-count tests |
| Background error hides usable data | High | Shared stale-data UI contract and success/failure component tests |
| Unrelated existing worktree changes are included | High | Touch only cache task files; inspect status/diff before any later commit |

## Open Questions

None required to start implementation. The target intervals in this plan are deliberate initial production defaults and should be changed only from observed backend load/UX evidence, not per-component preference.
