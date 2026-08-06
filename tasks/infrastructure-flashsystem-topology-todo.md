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
- [ ] Task 7 — `flashsystem` platform: selector, page branching, `useInfrastructureInventory` support
- [ ] Task 8 — FlashSystem toolbar branch (view switch)
- [ ] Task 9 — Wire into `InfrastructurePage.tsx`
- [ ] **Checkpoint:** full test suite green, manual dev-server run across all 3 platforms + all 3 FlashSystem views

## Before starting implementation
- [x] Resolve open question: `view` is a real server-side filter (confirmed with 4 real captured responses) — fetch-per-view design stands
- [ ] User has reviewed and approved `infrastructure-flashsystem-topology-plan.md`
