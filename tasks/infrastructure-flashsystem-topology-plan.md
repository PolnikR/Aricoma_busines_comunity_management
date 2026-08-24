# Implementation Plan: FlashSystem Volume Tree in Infrastructure Topology

## Overview

Integrate the new backend endpoint `GET /get_volume_tree` (params: `provider_id`, `view` = `all|flat|snapshot|consistency_group`) into the existing Infrastructure Topology page (`src/features/discovery-inventory/infrastructure/`), so IBM FlashSystem volume/FlashCopy/consistency-group relationships render as a topology graph alongside the existing VMware and IBM Power views.

The endpoint returns pool-rooted trees, one per requested view: `flat` (pool → volume), `snapshot` (pool → volume(source) → fcmap → volume(target)), and `consistency_group` (pool → consistency_group → fcmap → volume(source) → volume(target)). This is a recursive tree shape, unlike the flat inventory lists the rest of discovery-inventory consumes — it needs new model types, a new schema, and a new mapping helper that flattens the tree into the existing `{ nodes, edges }` `InfrastructureTopology` shape the topology canvas already renders (via elkjs + React Flow).

## Architecture Decisions

- **New node kinds, not a new graph model.** Extend `TopologyNodeKind` with `pool | volume | fcmap | consistencyGroup` rather than building a parallel rendering pipeline. This lets `InfrastructureTopologyWorkspace`, `layoutInfrastructureTopology`, and `InfrastructureTopologyCanvas` stay untouched — they already operate generically on `{ nodes, edges }`.
- **View selection reuses the toolbar pattern, not a new page.** `InfrastructureTopologyToolbar.tsx` already branches its filter UI by platform (`isPower` conditional). Add a third `platform === 'flashsystem'` branch with a view selector (`flat | snapshot | consistency_group`), matching the Swagger UI's own `view` dropdown.
- **Fetch per-view, not the whole `views` object.** The backend endpoint always returns all three views in one payload today, but modeling the query key on `(providerId, view)` keeps the fetch/cache pattern consistent with every other discovery-inventory hook (one query key per "what the UI is currently looking at"), and is forward-compatible if the backend later accepts `view` as a real filter instead of a client-side pick.
- **Discriminated union for tree nodes**, not a loose `Record<string, unknown>` detail bag. Each `kind` has a meaningfully different `detail` shape (pool capacity stats vs. volume `role`/`is_snapshot_target` vs. fcmap progress/timing vs. consistency_group span info). A discriminated union on `kind` gives real type safety when the mapping helper switches on it, instead of casting.
- **FlashCopy source→target relationships become a new edge kind (`copies`)**, not reused as `contains`. `contains` already means structural containment (cluster contains host, pool contains volume). A source volume "copies to" a target volume via an fcmap is a different relationship and should read differently in the legend/graph (e.g. dashed edge).
- **Platform-gating changes are additive.** `useInfrastructureInventory` currently hard-excludes `FLASHCOPY`; extending it to support FlashSystem is a small, isolated change (branch by provider type) rather than a rewrite.

## Task List

### Phase 1: Data layer (model → schema → API → hook)

- [x] Task 1: Add FlashSystem volume-tree model types
- [ ] Task 2: Add API schema, endpoint config, fetch function, and query key
- [ ] Task 3: Add a data-fetching hook for the volume tree

### Checkpoint: Data layer
- [ ] `npx tsc -b` clean
- [ ] New tests for Tasks 1-3 pass in isolation
- [ ] Manually confirm (via a temporary console.log or test) that a real `/get_volume_tree` response parses without schema errors

### Phase 2: Topology mapping and rendering

- [ ] Task 4: Extend `TopologyNodeKind`/`TopologyEdgeKind` and write the tree→graph mapping helper
- [ ] Task 5: Add node components (Pool, Volume, FlashCopyMap, ConsistencyGroup) + tooltips
- [ ] Task 6: Register new node types and legend entries

### Checkpoint: Topology mapping and rendering
- [ ] `npx tsc -b` clean, `npx eslint` clean on touched files
- [ ] Mapping helper unit tests cover all three views (flat/snapshot/consistency_group) with representative fixtures
- [ ] Manual check: render one view's output through `layoutInfrastructureTopology` and confirm no crashes with a real captured payload

### Phase 3: UI integration (platform selector, toolbar, page)

- [ ] Task 7: Add `flashsystem` as a selectable platform (source selector, page branching, `useInfrastructureInventory`)
- [ ] Task 8: Add the FlashSystem toolbar branch (view switch: flat / snapshot / consistency group)
- [ ] Task 9: Wire it all together in `InfrastructurePage.tsx`

### Checkpoint: Complete
- [ ] Full existing infrastructure test suite still passes (VMware/Power untouched)
- [ ] New FlashSystem topology tests pass
- [ ] Manual run: dev server, select FlashSystem provider, switch between the three views, confirm graph renders and legend/tooltips are correct
- [ ] Ready for review

## Task Details

### Task 1: Add FlashSystem volume-tree model types — ✅ DONE
**Description:** Add discriminated-union types for the recursive tree node (`FlashSystemTreeNodeKind`, per-kind detail interfaces, `FlashSystemTreeNode`), the view union (`FlashSystemVolumeTreeView`), and the top-level response shape (`counts`, `views`, `provider_id`, `provider_type`) to `discoveryTypes.ts`.
**Acceptance criteria:**
- [x] `FlashSystemTreeNode` recursively types `children: FlashSystemTreeNode[]`
- [x] Pool/volume/fcmap/consistency_group detail shapes match the real payload fields captured in this conversation (including volume's optional `role`)
**Verification:**
- [x] `npx tsc -b` clean
- [x] Manual check: real captured payload (all 3 views) validated against `satisfies FlashSystemVolumeTreeResponse` as a throwaway file inside `src/`, confirmed clean, then deleted
**Dependencies:** None
**Files touched:** `src/features/discovery-inventory/model/discoveryTypes.ts`
**Estimated scope:** Small
**Note for Task 2 (schema):** `role` is optional on volume detail and is only ever set on the *nested* volume inside an fcmap subtree — the outer/first volume in both `snapshot` and `consistency_group` views has no `role` tag (not even an implicit `'source'`), so the schema/mapping helper must not assume "no role → not a source."

### Task 2: API schema, endpoint config, fetch function, query key
**Description:** Add a zod schema for the volume-tree response (mirroring Task 1's types), a new endpoint entry, a `fetchFlashSystemVolumeTree(providerId, view)` function following the existing `fetchFlashSystemInventory` pattern (extra `view` query param), and a query key `discoveryInventoryKeys.volumeTree(providerId, view)`.
**Acceptance criteria:**
- [ ] Schema round-trips the real captured payload without validation errors
- [ ] Fetch function builds `?provider_id=...&view=...` correctly and throws on non-ok status (matching `fetchProviderPayload`'s error convention)
**Verification:**
- [ ] `npx vitest run src/features/discovery-inventory/api/discoveryInventoryApi.test.ts src/features/discovery-inventory/api/discoveryInventoryQueryKeys.test.ts`
- [ ] `npx tsc -b` clean
**Dependencies:** Task 1
**Files likely touched:**
- `src/features/discovery-inventory/api/schemas/flashSystemVolumeTreeSchema.ts` (new)
- `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- `src/features/discovery-inventory/api/discoveryInventoryQueryKeys.ts`
- `src/config/apiEndpoints.ts`
- matching `.test.ts` files
**Estimated scope:** Medium

### Task 3: Data-fetching hook
**Description:** A `useFlashSystemVolumeTree(providerId, view, enabled)` hook (React Query) following the same shape as `useInfrastructureInventory`, returning the parsed tree for the requested view plus `counts`.
**Acceptance criteria:**
- [ ] Hook only fetches when both `providerId` and `view` are present (mirrors existing `enabled` gating conventions)
- [ ] Returns loading/error/data states consistent with other discovery-inventory hooks
**Verification:**
- [ ] New hook test passes
- [ ] `npx tsc -b` clean
**Dependencies:** Task 2
**Files likely touched:** `src/features/discovery-inventory/infrastructure/hooks/useFlashSystemVolumeTree.ts` (new) + test
**Estimated scope:** Small

### Task 4: Topology kinds + tree→graph mapping helper
**Description:** Add `pool | volume | fcmap | consistencyGroup` to `TopologyNodeKind` and a `copies` edge kind to `TopologyEdgeKind` in `model/topologyTypes.ts`. Write `mapFlashSystemVolumeTreeToTopology(tree: FlashSystemTreeNode[]): InfrastructureTopology`, walking the recursive tree and emitting `{ nodes, edges }` using the existing `createTopologyNodeId`/`createTopologyEdgeId` helpers for consistent id generation. Volume→volume relationships inside an fcmap subtree become `copies` edges; everything else structural becomes `contains`.
**Acceptance criteria:**
- [ ] Handles all three views (a node kind never assumed to appear only in one view)
- [ ] Deduplicates a volume that appears more than once across branches (e.g. a source volume referenced by multiple fcmaps) into a single node with multiple edges, not duplicate nodes
- [ ] Sorted, deterministic output (matches existing helpers' convention)
**Verification:**
- [ ] `npx vitest run` on new helper test, covering flat/snapshot/consistency_group fixtures built from the real captured payload
- [ ] `npx tsc -b` clean
**Dependencies:** Task 1
**Files likely touched:** `src/features/discovery-inventory/infrastructure/model/topologyTypes.ts`, `src/features/discovery-inventory/infrastructure/helpers/mapFlashSystemVolumeTreeToTopology.ts` (new) + test
**Estimated scope:** Medium — this is the highest-risk task (recursive walk + dedup logic); do it early

### Task 5: Node components + tooltips
**Description:** `PoolNode`, `FlashVolumeNode`, `FlashCopyMapNode`, `ConsistencyGroupNode`, each wrapped in `TopologyNodeShell` following the existing `ClusterNode`/`HostNode` pattern, plus matching tooltip content components built on `TopologyTooltip`.
**Acceptance criteria:**
- [ ] Each node shows the 2-3 most useful `detail` fields at a glance (e.g. pool: capacity/free_capacity; volume: capacity/status, and role badge when present; fcmap: status/progress; consistency_group: fc_mapping_count/status)
- [ ] Tooltips surface the rest of `detail` without cluttering the node itself
**Verification:**
- [ ] Component tests for each node + tooltip pass
- [ ] Visual check in dev server
**Dependencies:** Task 4
**Files likely touched:** `src/features/discovery-inventory/infrastructure/components/nodes/PoolNode.tsx`, `FlashVolumeNode.tsx`, `FlashCopyMapNode.tsx`, `ConsistencyGroupNode.tsx` (+ tooltips, + tests)
**Estimated scope:** Medium

### Task 6: Register node types + legend + `copies` edge styling
**Description:** Add the four new node types to `topologyNodeTypes.ts` and corresponding entries to `InfrastructureTopologyLegend.tsx`. Also give the `copies` edge kind a distinct style in `topologyFlowModel.ts`, following the existing precedent there (`edge.kind === 'uses'` already renders dashed `stroke: '#9aa8bc', strokeDasharray: '5 4'`) — add a `copies` branch with its own dashed/colored style so FlashCopy source→target relationships read differently from structural `contains` edges, and add a matching legend entry.
**Acceptance criteria:**
- [ ] Legend lists all four new node kinds with matching visual treatment to the nodes
- [ ] `copies` edges render dashed/colored, distinct from `contains`, with a legend entry explaining the distinction
**Verification:**
- [ ] Existing legend test updated/passes
- [ ] `topologyFlowModel` test covers the new `copies` edge style branch
**Dependencies:** Task 5
**Files likely touched:** `topologyNodeTypes.ts`, `InfrastructureTopologyLegend.tsx`, `topologyFlowModel.ts` (+ tests)
**Estimated scope:** Small

### Task 7: Platform selector + `useInfrastructureInventory` support
**Description:** Add `'flashsystem'` to `InfrastructureTopologyPlatform`, a third `<option>` in `InfrastructureSourceSelector.tsx`, and extend `useInfrastructureInventory` to support FLASHCOPY providers (today explicitly excluded).
**Acceptance criteria:**
- [ ] Selecting "IBM FlashSystem" in the source selector is possible when an eligible provider exists
- [ ] Existing VMware/Power behavior unchanged
**Verification:**
- [ ] Existing + new tests for selector and hook pass
**Dependencies:** None (parallel to Phase 2)
**Files likely touched:** `model/topologyTypes.ts`, `InfrastructureSourceSelector.tsx`, `hooks/useInfrastructureInventory.ts` (+ tests)
**Estimated scope:** Small

### Task 8: FlashSystem toolbar branch
**Description:** Extend `InfrastructureTopologyToolbar.tsx` with a `platform === 'flashsystem'` branch offering the view switch (flat / snapshot / consistency group), reusing the existing Auto Layout / Reset / Fit View controls.
**Acceptance criteria:**
- [ ] View switch changes which tree the page requests/maps, without remounting the whole canvas unnecessarily
**Verification:**
- [ ] Toolbar test covering the new branch
**Dependencies:** Task 7
**Files likely touched:** `InfrastructureTopologyToolbar.tsx` (+ test)
**Estimated scope:** Small

### Task 9: Wire into `InfrastructurePage.tsx`
**Description:** Branch the page's data-fetching/mapping logic on `platform === 'flashsystem'`: call `useFlashSystemVolumeTree`, map via `mapFlashSystemVolumeTreeToTopology`, and pass through to the existing `InfrastructureTopologyWorkspace`.
**Acceptance criteria:**
- [ ] Page compiles and renders for all three platforms
- [ ] URL/search-param handling for `platform=flashsystem` matches the existing `vmware`/`ibm-power` convention
**Verification:**
- [ ] `InfrastructurePage.test.tsx` updated and passing
- [ ] Manual run through the dev server for all three platforms + all three FlashSystem views
**Dependencies:** Tasks 6, 8
**Files likely touched:** `InfrastructurePage.tsx` (+ test)
**Estimated scope:** Medium

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Volume dedup logic in the mapping helper (a volume can appear as both a `flat` pool child and, in other views, as an fcmap source/target) gets the id wrong and produces duplicate/orphaned nodes | Medium — broken graph, confusing to users | Build the id from the FlashSystem volume's real `id`/`name` (not its tree `key`, which is path-based and non-unique across views), and write dedup-focused unit tests first (Task 4) before building UI on top |
| `is_snapshot_target`/`has_snapshots`/`role` fields are inconsistently present across kinds/views based on the sample payload | Low — type errors or missing UI states | Model these as optional in the discriminated union (Task 1) and design node components to degrade gracefully when absent (Task 5) |
| Large FlashSystem estates (the sample already has 46 volumes / 42 fcmaps for one provider) could make the `consistency_group` view's graph dense/slow to lay out | Medium — poor UX on bigger environments | Not a v1 blocker (see resolved open question below); revisit with toolbar filtering (Task 8) as a fast-follow if manual testing on a larger real estate shows layout/readability problems |

## Open Questions

- ~~Does `view=all` return a merged tree, or all three views bundled?~~ **RESOLVED**, confirmed with 4 real captured responses: `view` is a genuine server-side filter. Requesting a single view (`flat`, `snapshot`, or `consistency_group`) returns `views` with only that one key populated; only `view=all` returns all three keys bundled in one response. The "fetch per-view, one request per `(providerId, view)`" design in Tasks 2/3 stands as originally planned — no change needed.
- ~~Should FlashCopy `copies` edges be visually distinct?~~ **RESOLVED: yes.** Task 5/6 should give `copies` edges a distinct style (dashed line, per the Architecture Decisions section) so they read differently from structural `contains` edges in both the graph and the legend.
- ~~Is a max-estate-size concern for v1, or a fast-follow?~~ **RESOLVED: fast-follow.** Ship v1 rendering the full graph as returned; only add toolbar-based filtering (pool/status narrowing) later if a real larger estate turns out to have layout/readability problems in practice. Not speculatively built now.
