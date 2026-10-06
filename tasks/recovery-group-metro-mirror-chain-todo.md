# Todo: Recovery Group Metro Mirror chain (approved D3)

Plan: `tasks/recovery-group-metro-mirror-chain-plan.md`

## Phase A — Shared graph generic extensions
- [x] Task 1: Graph options — `density`, `dimming`, `highlightScope`, `activeEntityId` / `onActiveEntityChange`
  - Acceptance: defaults unchanged (existing tests pass untouched); component scope highlights a whole
    connected row; soft dimming = 60 %; external active id highlights; internal hover reported.
  - Verify: `npm exec vitest run src/shared/components/relationship-graph`
  - Files: `RelationshipGraph.tsx`, `relationshipGraphContext.ts`, `relationshipAdjacency.ts`, `relationshipGraphTypes.ts`, tests
- [x] Task 2: Connector rich content — kinds `replication` / `protection`, `value`, `note`, `progress`, `lineStyle`
  - Acceptance: simple `label` usage renders as before; progress fill honours direction; 0 is a real
    fill; dashed independent of kind.
  - Verify: graph tests
  - Files: `RelationshipConnector.tsx`, `relationshipGraphTypes.ts`, tests
- [x] Task 3: Node `onActivate` + `nameLines`, chain `layout="leading"`, group `header` + `RelationshipLanes`
  - Acceptance: actionable node is a `<button>` with description; passive stays a group; lanes hidden
    when stacked; defaults unchanged.
  - Verify: graph tests
  - Files: `RelationshipNode.tsx`, `RelationshipChain.tsx`, `RelationshipGroup.tsx`, `RelationshipLanes.tsx`, `index.ts`, tests

### Checkpoint A
- [x] Graph + all consumer tests pass (Provider, VMware, IBM Power, FlashSystem)
- [x] ESLint on changed files, `npx tsc -b --noEmit`

## Phase B — Recovery Group
- [x] Task 4: Metro Mirror presentation helper (state table → tone/label, progress value, row exceptions, direction)
  - Acceptance: explicit IBM states, unknown → neutral, null progress ≠ 0, 0 stays 0.
  - Files: `helpers/metroMirrorPresentation.ts` + test
- [x] Task 5: Status block + replication chain (pagination, dedup, reversed, missing auxiliary, soft highlight)
  - Files: `components/RecoveryGroupMetroMirrorStatus.tsx`, `components/RecoveryGroupReplicationChain.tsx`, tests, locales
- [x] Task 6: Auxiliary inventory + FlashCopy fan-out (bounded 240 px list, sticky header, technical JSON),
  cross-highlight and chain → inventory reveal; quiet summary; `size="xl"`
  - Files: `components/RecoveryGroupInventory.tsx`, `components/RecoveryGroupFlashCopyFanOut.tsx`, `RecoveryGroupsTable.tsx`, tests, locales

### Checkpoint B
- [x] Recovery Group + graph + consumer tests pass, ESLint, tsc, `git diff --check`

## Phase C — Browser verification
- [x] Task 7: Real app — Recovery Group Inventory (xl, compact, 375 px, light/dark, all scenarios) and
  Provider / VMware / IBM Power helpers regression; fix findings in place.

## Verification notes
- Real app (Edge CDP, `localhost:5173`): live `db_and_app` inventory (consistent_synchronized, null
  progress) plus CDP-fulfilled fixtures derived from the real response for copying, mixed, 12
  mappings, missing auxiliary, error, empty and `metro_mirror = null`. xl dialog 1200 px, no
  horizontal overflow, no console errors; dark mode; 375 px stacked layout.
- Helpers re-checked in the browser: Provider, VMware VM and IBM Power LPAR help graphs unchanged.
- DetailView compact mode could not be toggled in the browser: another session's uncommitted
  `DetailView.tsx` removes it. The stacked chain/fan-out was verified through the narrow viewport.
- Deviations from D3: Mode is a fact in `DetailStatusBlock` (one reference row only), not next to
  the queried provider; "Show technical JSON" keeps the existing `ResponseBodyViewer` disclosure;
  problem nodes use the shared problem style (mono name).

## Known limitation (non-blocking)
- `RelationshipGraph` validates a controlled `activeEntityId` through the edge adjacency map
  (`RelationshipGraph.tsx`, `adjacency.has(activeEntityId)`), so a rendered node with no edge (an
  isolated node, e.g. every node of the feature-local FlashCopy fan-out, which renders with
  `edges={[]}`) cannot be highlighted externally. No current production interaction depends on this;
  no change is required for this release.
