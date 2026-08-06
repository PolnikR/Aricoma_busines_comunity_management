# Todo: FlashSystem Volume Tree in Infrastructure Topology

See `infrastructure-flashsystem-topology-plan.md` for full detail, rationale, and acceptance criteria per task.

## Phase 1: Data layer
- [x] Task 1 — FlashSystem volume-tree model types (`model/discoveryTypes.ts`)
- [x] Task 2 — API schema + endpoint config + fetch fn + query key
- [x] Task 3 — `useFlashSystemVolumeTree` hook
- [x] **Checkpoint:** tsc clean (aside from a pre-existing, unrelated error in `RecoveryGroupsTable.tsx`), Task 1-3 tests pass, real payload parses cleanly

## Phase 2: Topology mapping and rendering
- [x] Task 4 — Extend `TopologyNodeKind`/`TopologyEdgeKind` + `mapFlashSystemVolumeTreeToTopology` helper
- [x] Task 5 — Node components + tooltips (Pool, Volume, FlashCopyMap, ConsistencyGroup)
- [x] Task 6 — Register node types + legend entries + `copies` edge styling
- [x] **Checkpoint:** tsc/eslint clean, mapping helper tests cover all 3 views (+ dedup), full infrastructure test suite green (96/96)

## Phase 3: UI integration
- [x] Task 7 — `flashsystem` platform: selector, page branching (see note below on `useInfrastructureInventory`)
- [x] Task 8 — FlashSystem toolbar branch (view switch)
- [x] Task 9 — Wire into `InfrastructurePage.tsx`
- [x] **Checkpoint:** full discovery-inventory test suite green (70 files / 217 tests), tsc/eslint clean; manual dev-server run NOT performed (no live backend in this session)

**Note on Task 7:** rather than extending `useInfrastructureInventory` to fetch FlashSystem data, `InfrastructurePage.tsx` calls the purpose-built `useFlashSystemVolumeTree(providerId, view)` hook (from Task 3) directly when `platform === 'flashsystem'`, and passes `null` to `useInfrastructureInventory` in that case. This fits the "fetch per-view" architecture decision already made for Tasks 2/3 — the generic hook has no concept of `view`, so bolting FlashSystem onto it would have meant a second, inconsistent fetch path. `useInfrastructureInventory` itself is unchanged.

## Before starting implementation
- [x] Resolve open question: `view` is a real server-side filter (confirmed with 4 real captured responses) — fetch-per-view design stands
- [ ] User has reviewed and approved `infrastructure-flashsystem-topology-plan.md`
