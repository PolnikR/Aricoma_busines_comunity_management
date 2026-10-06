# Todo: Recovery Group Metro Mirror chain (approved D3)

Plan: `tasks/recovery-group-metro-mirror-chain-plan.md`

## Phase A — Shared graph generic extensions
- [ ] Task 1: Graph options — `density`, `dimming`, `highlightScope`, `activeEntityId` / `onActiveEntityChange`
  - Acceptance: defaults unchanged (existing tests pass untouched); component scope highlights a whole
    connected row; soft dimming = 60 %; external active id highlights; internal hover reported.
  - Verify: `npm exec vitest run src/shared/components/relationship-graph`
  - Files: `RelationshipGraph.tsx`, `relationshipGraphContext.ts`, `relationshipAdjacency.ts`, `relationshipGraphTypes.ts`, tests
- [ ] Task 2: Connector rich content — kinds `replication` / `protection`, `value`, `note`, `progress`, `lineStyle`
  - Acceptance: simple `label` usage renders as before; progress fill honours direction; 0 is a real
    fill; dashed independent of kind.
  - Verify: graph tests
  - Files: `RelationshipConnector.tsx`, `relationshipGraphTypes.ts`, tests
- [ ] Task 3: Node `onActivate` + `nameLines`, chain `layout="leading"`, group `header` + `RelationshipLanes`
  - Acceptance: actionable node is a `<button>` with description; passive stays a group; lanes hidden
    when stacked; defaults unchanged.
  - Verify: graph tests
  - Files: `RelationshipNode.tsx`, `RelationshipChain.tsx`, `RelationshipGroup.tsx`, `RelationshipLanes.tsx`, `index.ts`, tests

### Checkpoint A
- [ ] Graph + all consumer tests pass (Provider, VMware, IBM Power, FlashSystem)
- [ ] ESLint on changed files, `npx tsc -b --noEmit`

## Phase B — Recovery Group
- [ ] Task 4: Metro Mirror presentation helper (state table → tone/label, progress value, row exceptions, direction)
  - Acceptance: explicit IBM states, unknown → neutral, null progress ≠ 0, 0 stays 0.
  - Files: `helpers/metroMirrorPresentation.ts` + test
- [ ] Task 5: Status block + replication chain (pagination, dedup, reversed, missing auxiliary, soft highlight)
  - Files: `components/RecoveryGroupMetroMirrorStatus.tsx`, `components/RecoveryGroupReplicationChain.tsx`, tests, locales
- [ ] Task 6: Auxiliary inventory + FlashCopy fan-out (bounded 240 px list, sticky header, technical JSON),
  cross-highlight and chain → inventory reveal; quiet summary; `size="xl"`
  - Files: `components/RecoveryGroupInventory.tsx`, `components/RecoveryGroupFlashCopyFanOut.tsx`, `RecoveryGroupsTable.tsx`, tests, locales

### Checkpoint B
- [ ] Recovery Group + graph + consumer tests pass, ESLint, tsc, `git diff --check`

## Phase C — Browser verification
- [ ] Task 7: Real app — Recovery Group Inventory (xl, compact, 375 px, light/dark, all scenarios) and
  Provider / VMware / IBM Power helpers regression; fix findings in place.
