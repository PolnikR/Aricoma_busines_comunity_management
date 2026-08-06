# Todo: FlashSystem Volume Tree in Infrastructure Topology

See `infrastructure-flashsystem-topology-plan.md` for full detail, rationale, and acceptance criteria per task.

## Phase 1: Data layer
- [ ] Task 1 — FlashSystem volume-tree model types (`model/discoveryTypes.ts`)
- [ ] Task 2 — API schema + endpoint config + fetch fn + query key
- [ ] Task 3 — `useFlashSystemVolumeTree` hook
- [ ] **Checkpoint:** tsc clean, Task 1-3 tests pass, real payload parses cleanly

## Phase 2: Topology mapping and rendering
- [ ] Task 4 — Extend `TopologyNodeKind`/`TopologyEdgeKind` + `mapFlashSystemVolumeTreeToTopology` helper
- [ ] Task 5 — Node components + tooltips (Pool, Volume, FlashCopyMap, ConsistencyGroup)
- [ ] Task 6 — Register node types + legend entries
- [ ] **Checkpoint:** tsc/eslint clean, mapping helper tests cover all 3 views, manual layout smoke test

## Phase 3: UI integration
- [ ] Task 7 — `flashsystem` platform: selector, page branching, `useInfrastructureInventory` support
- [ ] Task 8 — FlashSystem toolbar branch (view switch)
- [ ] Task 9 — Wire into `InfrastructurePage.tsx`
- [ ] **Checkpoint:** full test suite green, manual dev-server run across all 3 platforms + all 3 FlashSystem views

## Before starting implementation
- [ ] Resolve open question: does `view=all` return a merged tree or the same `views` bundle? (affects Task 2's fetch contract)
- [ ] User has reviewed and approved `infrastructure-flashsystem-topology-plan.md`
