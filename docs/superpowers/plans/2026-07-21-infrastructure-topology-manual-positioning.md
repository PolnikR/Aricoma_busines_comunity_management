# Manual Node Repositioning for Infrastructure Topology

**Date:** 2026-07-21  
**Status:** ✅ Complete & Tested  
**Tests:** 31/31 passing  
**Build:** ✅ Passing

## Overview

Enabled users to manually drag nodes (VMs, hosts, datastores) in the Infrastructure Topology diagram into custom positions that persist across page reloads, filter changes, and data refreshes. Cluster nodes remain fixed to preserve the ELK auto-layout structure.

## What Changed

### New Files

1. **`src/features/discovery-inventory/infrastructure/hooks/useTopologyNodePositionOverrides.ts`** (45 lines)
   - React hook managing localStorage-backed position overrides
   - Graceful fallback on corrupted/missing storage (Safari private mode, etc.)
   - Uses `zod` schema validation to match existing error-tolerance patterns

2. **`src/features/discovery-inventory/infrastructure/layout/applyNodePositionOverrides.ts`** (17 lines)
   - Pure function merging saved overrides into ELK-computed positions
   - Returns same object reference when overrides empty (optimization)
   - Does not mutate input topology

### Modified Files

3. **`src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyWorkspace.tsx`**
   - Added hook usage: `useTopologyNodePositionOverrides()`
   - Added `overridesRef` mirroring effect (prevents re-layout on every drag-stop)
   - Updated layout effect: calls `applyTopologyNodePositionOverrides()` after ELK layout
   - Updated `handleAutoLayout`: clears overrides before re-running ELK
   - Passes `onNodePositionChange={setOverride}` to Canvas component

4. **`src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyCanvas.tsx`**
   - Removed `nodesDraggable={false}` (let per-node `draggable` flag control behavior)
   - Added `onNodePositionChange` optional prop
   - Imported `OnNodeDrag` type from `@xyflow/react`
   - Added `handleNodeDragStop` handler: calls `onNodePositionChange?.(node.id, node.position)`
   - Wired `onNodeDragStop={handleNodeDragStop}` to ReactFlow instance

5. **`src/features/discovery-inventory/infrastructure/components/topologyFlowModel.ts`**
   - Added `draggableNodeKinds` Set: `['host', 'virtualMachine', 'datastore']`
   - Replaced hardcoded `draggable: false` with conditional: `draggableNodeKinds.has(node.kind)`
   - Cluster nodes remain non-draggable by design

### Test Updates

6. **`src/features/discovery-inventory/infrastructure/components/topologyFlowModel.test.ts`**
   - Updated VM/datastore assertions: `draggable: false` → `draggable: true`
   - Added cluster node test: asserts `draggable: false` for clusters

## Design Rationale

### Why localStorage (not backend)?
- **First UI-state persistence in the app** — no prior pattern to extend
- **Simplest implementation** — no mutations API, no server round-trip needed
- **User expectation:** dragged layouts are transient, refresh-reset is acceptable

### Why a ref for overrides, not reactive state?
- **Prevents drag-induced re-layout**: if the layout effect depended on `overrides`, every drag-stop would re-trigger ELK, producing stale positions and fighting in-flight drags
- **Pattern:** mirror state into a ref, read the ref in async callbacks (`useEffect`'s `.then()`, `handleAutoLayout`)
- **Dependency array stays `[filteredTopology]`** — unchanged from before

### Why dragging doesn't clobber dropped nodes
- **Workspace state separation:** drag-stop only updates `overrides` state, never touches `layoutResult`
- **Canvas memoization:** `flowElements` memo is keyed on `topology` (from `layoutResult`), so after a drag-stop, the memo returns its cached value
- **Effect guard:** resync effect (calling `setNodes`) only re-runs if `flowElements` reference changes — it stays the same after a drag-stop
- **Result:** dropped node position is left alone by construction, no flash/revert

### Why clusters stay fixed
- Clusters occupy ELK's leftmost column and represent logical grouping
- Few cluster instances per topology → low value in repositioning them
- Prevents accidental re-arrangement that breaks the hierarchy

## How It Works

### User Journey

1. **Drag a VM/host/datastore node** on the diagram
2. **Release → position saved** to `localStorage` under key `'abcm-fe.infrastructure-topology.node-positions.v1'`
3. **Reload page → position persists** (hook reads from storage on mount)
4. **Change filter/search → node keeps its position** (merge step re-applies overrides after ELK re-layout)
5. **Click "Auto layout" → all positions reset** to fresh ELK layout, storage cleared

### Storage Schema

```json
{
  "host:esx-01": { "x": 150, "y": 250 },
  "virtualMachine:vm-42": { "x": 400, "y": 100 },
  "datastore:datastore-01": { "x": 600, "y": 300 }
}
```

- Key: stable node ID (`` `${kind}:${encodeURIComponent(sourceId)}` ``)
- Value: final position `{x, y}` after drag-stop

## Testing

### Test Coverage

- **Hook tests (9):** initialization, round-trip persist, storage failures, corrupted JSON, private mode
- **Merge function tests (6):** override application, no mutation, empty map short-circuit
- **Flow model tests (4):** conditional draggable per node kind
- **Integration tests (12):** existing infrastructure topology tests (all pass)

### Manual Verification

Run locally:
```bash
npm run build          # ✅ TypeScript + Vite build
npx vitest run src/features/discovery-inventory/infrastructure  # ✅ 31/31 passing
```

Browser testing:
1. Open Infrastructure Topology page
2. Drag a VM node → position updates on screen
3. Reload page → node stays in dragged position
4. Change a filter → node stays in position, others re-flow around it
5. Click "Auto layout" → all positions reset to ELK, localStorage cleared
6. Reload → back to auto-layout positions

## Known Trade-offs

1. **Node detachment on filter change:** A manually-moved node can visually separate from neighbors after a filter change reshuffles everyone else around it. Edges may route oddly. This is deliberate (requested behavior) — the custom position overrides ELK's fresh layout.

2. **Orphaned overrides on rename:** If a `host`/`datastore` is renamed in vCenter, its node ID changes (`createTopologyNodeId` uses the name), and the old override is silently orphaned in localStorage. A few bytes, never matched — acceptable for now. Optional mitigation: periodic cleanup task if this becomes annoying.

3. **No cross-tab sync:** Two tabs open on the same page won't see each other's drag-position changes until a reload/refetch. Out of scope unless requested.

4. **No undo/revert button beyond "Auto layout":** The existing "Auto layout" button clears all manual positions in one action. No per-node revert. Acceptable given the easy re-drag workflow.

## Files Touched

| File | Type | Lines | Changes |
|---|---|---|---|
| `hooks/useTopologyNodePositionOverrides.ts` | New | 45 | Hook implementation + storage |
| `hooks/useTopologyNodePositionOverrides.test.ts` | New | 95 | Full test coverage |
| `layout/applyNodePositionOverrides.ts` | New | 17 | Pure merge function |
| `layout/applyNodePositionOverrides.test.ts` | New | 100 | Full test coverage |
| `components/InfrastructureTopologyWorkspace.tsx` | Modified | +30 | Hook integration, merge wiring |
| `components/InfrastructureTopologyCanvas.tsx` | Modified | +15 | Drag handler, prop addition |
| `components/topologyFlowModel.ts` | Modified | +3 | Conditional draggable |
| `components/topologyFlowModel.test.ts` | Modified | +25 | Updated assertions + cluster test |

## Future Enhancements (Optional)

1. **Orphaned-key cleanup:** After each layout, compare node IDs against override keys and write back pruned set
2. **Cross-tab sync:** Add `storage` event listener to sync positions across tabs/windows of the same page
3. **Per-node reset:** Button to "reset this node to auto-layout" without clearing others
4. **Export/import:** Save/restore position snapshots as JSON for different "view profiles"

## Layout Direction Update: Top-to-Bottom Flow

**Date:** 2026-07-21 (same session)

Changed the ELK layout direction from `RIGHT` (left-to-right) to `DOWN` (top-to-bottom) so that VMs and other same-layer nodes spread horizontally (left-to-right) instead of stacking vertically.

### Changes

1. **`src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.ts`**
   - Changed `'elk.direction': 'RIGHT'` → `'elk.direction': 'DOWN'`

2. **`src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.test.ts`**
   - Updated test assertions from checking x-axis ordering to y-axis ordering (layer sequence now progresses top-to-bottom, not left-to-right)

### Visual Impact

- **Before:** Clusters (left) → Hosts → VMs (stacked vertically) → Datastores (right)
- **After:** Clusters (top) → Hosts → VMs (spread horizontally) → Datastores (bottom)

### Compatibility

- No ripple effects on canvas rendering, drag positioning, or manual overrides — all consume `{x,y}` coordinates regardless of ELK flow direction
- Existing localStorage position overrides continue to work without modification
- MiniMap, Controls, and fitView operate on the bounding box, unaffected by direction

## References

- Commit: (feature branch: `spike/ant-design-shell` — pending integration)
- Plan document: `C:\Users\polnikr\.claude\plans\radiant-sprouting-nova.md`
- Related work: [[2026-07-17-infrastructure-topology-implementation]] (original topology system)

## Verification Checklist

- [x] Build passes: `npm run build`
- [x] All tests pass: `npx vitest run src/features/discovery-inventory/infrastructure`
- [x] No TypeScript errors
- [x] localStorage fallback verified (corrupted JSON, private mode)
- [x] Drag-stop doesn't trigger re-layout (ref pattern)
- [x] Dropped positions persist across reload
- [x] Auto-layout clears overrides
- [x] Cluster nodes remain fixed
- [x] No new console errors/warnings
