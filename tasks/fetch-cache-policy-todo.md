# Todo: Production Fetch and Cache Policy

## Target behavior

- [x] Standard policy for every normal query: `15 min stale / 60 min gc / 15 min visible interval`.
- [x] Standard triggers: stale mount, stale window focus, reconnect, manual refresh, and mutation invalidation.
- [x] Hidden browser tabs do not execute interval requests.
- [x] Cached data stays visible during every background refresh.
- [x] Successful background refresh replaces old data with the new response.
- [x] Failed background refresh keeps old data and shows a non-blocking warning/retry.
- [x] Active Recovery latest-run query refreshes every 15 seconds while non-terminal and visible.
- [x] Terminal/no-run latest query returns to the standard 15-minute cycle.

## Phase 1: Cache contract foundation

- [x] Task 1: Lock down canonical query keys, data shapes, request counts, and current inconsistencies.
- [x] Task 2: Add the shared standard policy and conditional active-run exception.
- [x] Task 3: Resolve same-key shape/policy inconsistencies (`vms-by-name`, `vdisks`, `recovery-runs/latest`).

## Checkpoint: Cache contracts

- [x] Same query key means the same operation, parameters, data shape, and policy.
- [x] Concurrent equal queries deduplicate to one request.
- [x] Standard and active-run timing/trigger tests pass.
- [x] Focused tests and focused lint pass.
- [x] Human approves the cache contract before broad migration.

## Phase 2: Standard production policy

- [x] Task 4: Align Discovery inventory and Providers with the standard policy.
- [x] Task 5: Migrate Platform Providers, Credentials, Policies, Tags, lookups, and Recovery Run history.
- [x] Task 6: Migrate Recovery Applications and Recovery Groups.

## Checkpoint: Standard behavior

- [x] Every migrated normal query uses `15/60/15` with no local timing override.
- [x] A visible mounted query sends one automatic request at 15 minutes.
- [x] A hidden tab sends no interval request.
- [x] Returning to a stale hidden tab triggers one catch-up background refresh.
- [x] Fresh focus/mount reuses cache without a request.
- [x] Manual Refresh still forces an immediate request.
- [x] Focused tests, typecheck, and focused lint pass.

## Phase 3: Mutation synchronization

- [x] Task 7: Standardize mutation `setQueryData` and narrow invalidation behavior.

## Checkpoint: Mutations

- [x] Provider `all/source/target` caches synchronize after mutations.
- [x] Policy/Application/Group caches cannot remain fresh-but-outdated after success.
- [x] Failed mutations leave existing cache intact.

## Phase 4: Live Recovery Run behavior

- [x] Task 8: Apply conditional 15-second refresh to canonical latest-run queries.

## Checkpoint: Recovery Runs

- [x] Non-terminal latest run refreshes every 15 seconds while mounted and visible.
- [x] Terminal/no-run latest state uses the standard 15-minute cycle.
- [x] Disabled, unmounted, and hidden-tab latest queries do not issue interval requests.
- [x] All `recovery-runs/latest` consumers use the same key, data shape, and policy.

## Phase 5: Stale-while-revalidate UI

- [x] Task 9: Standardize background-refresh presentation across representative screens.

## Checkpoint: Loading and errors

- [x] Blocking skeleton appears only when no usable data exists for the current key.
- [x] `isFetching && data` keeps existing content rendered and shows only a non-blocking updating state.
- [x] Background success swaps in new data without remounting page controls.
- [x] Background failure preserves stale data and exposes warning/retry UI.

## Phase 6: Final audit

- [x] Task 10: Audit all production query consumers and document the final contract.
- [x] Every normal query uses the standard policy or has an explicitly approved semantic exception.
- [x] No feature defines an arbitrary local `staleTime`, `gcTime`, or `refetchInterval`.
- [x] Run all directly affected Vitest files explicitly.
- [x] Run `npm run typecheck`.
- [x] Run ESLint only for changed TypeScript/TSX files.
- [x] Run `git diff --check` and inspect diff/status.

## Final Review Gate

- [x] Human has reviewed and approved this revised plan before implementation begins.
