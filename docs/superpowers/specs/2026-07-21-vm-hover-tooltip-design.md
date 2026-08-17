# VM Node Hover Tooltip Design

**Date:** 2026-07-21  
**Feature:** Hover tooltips showing rich VM details in the infrastructure topology diagram  
**Status:** Design approved, ready for implementation

---

## Overview

When a user hovers over a virtual machine node in the infrastructure topology diagram, a tooltip appears after 500ms showing rich details about that VM: name, status, CPU cores, memory, disk, IP address, host, cluster, and tags. The tooltip is fixed to the top-right of the node and disappears immediately when the mouse leaves.

**Goal:** Provide quick access to VM metadata without opening the detail panel, reducing friction for exploration and discovery.

---

## Requirements

### Content
Display the following fields in vertical list format (label: value pairs):
- **Name** (always present)
- **Status** (always present)
- **CPU** (cores, optional)
- **Memory** (GB, optional)
- **Disk** (GB, optional)
- **IP Address** (optional)
- **Host** (optional)
- **Cluster** (optional)
- **Tags** (optional, rendered as chips)

### Behavior
- Appear after 500ms of hovering over a VM node
- Disappear immediately when the mouse leaves the node
- If the user hovers again after leaving, the 500ms delay resets
- If the user moves the mouse away before 500ms elapses, the tooltip never shows

### Positioning
- Fixed to the **top-right** of the VM node
- Rendered as an absolute-positioned overlay relative to the node container
- Layered above other nodes and UI elements (z-index: 50)
- May clip at canvas edges (acceptable for first iteration; user can pan to view)

---

## Architecture

### Component Structure

```
VirtualMachineNode (modified)
├── TopologyNodeShell (existing)
├── VMNodeTooltip (new)
│   ├── Label-value pairs for metrics
│   └── Tags section (conditional)
└── React Flow Handles (existing)
```

### Files

**New file:**
- `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.tsx`

**Modified files:**
- `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.tsx` — integrate tooltip, manage hover state

### Data Flow

1. **Data source:** VM node receives complete node data from React Flow (already includes all properties: name, status, cpu, memory, disk, ipAddress, host, cluster, tags)
2. **Tooltip extraction:** VirtualMachineNode passes node data to VMNodeTooltip
3. **No additional API calls:** All data is already in the node, no network round-trips needed
4. **Formatting:** Tooltip formats numeric fields (cpu → "4 cores", memory → "8 GB") and handles missing fields

---

## Implementation Details

### VMNodeTooltip Component

```tsx
interface VMNodeTooltipProps {
  data: {
    name: string
    status: string
    cpu?: number
    memory?: number
    disk?: number
    ipAddress?: string
    host?: string
    cluster?: string
    tags?: string[]
  }
}

export function VMNodeTooltip({ data }: VMNodeTooltipProps) {
  return (
    <div className="absolute top-0 right-0 z-50 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-lg min-w-[260px]">
      <div className="space-y-2">
        <Field label="Name" value={data.name} />
        <Field label="Status" value={data.status} />
        <Field label="CPU" value={data.cpu ? `${data.cpu} cores` : '—'} />
        <Field label="Memory" value={data.memory ? `${data.memory} GB` : '—'} />
        <Field label="Disk" value={data.disk ? `${data.disk} GB` : '—'} />
        <Field label="IP" value={data.ipAddress || '—'} />
        <Field label="Host" value={data.host || '—'} />
        <Field label="Cluster" value={data.cluster || '—'} />
        {data.tags?.length ? (
          <div>
            <div className="text-xs font-semibold text-slate-400">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map(tag => (
                <span key={tag} className="inline-block rounded bg-slate-700 px-2 py-1 text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="ml-2 truncate text-slate-100">{value}</span>
    </div>
  )
}
```

### VirtualMachineNode Integration

**State and refs:**
```tsx
const [showTooltip, setShowTooltip] = useState(false)
const timeoutRef = useRef<NodeJS.Timeout | null>(null)
```

**Event handlers:**
```tsx
const handleMouseEnter = () => {
  timeoutRef.current = setTimeout(() => {
    setShowTooltip(true)
  }, 500)
}

const handleMouseLeave = () => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
  }
  setShowTooltip(false)
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }
}, [])
```

**Render:**
```tsx
<div
  onMouseEnter={handleMouseEnter}
  onMouseLeave={handleMouseLeave}
  className="relative"
>
  <TopologyNodeShell {...shellProps}>
    {children}
  </TopologyNodeShell>
  {showTooltip ? <VMNodeTooltip data={node.data} /> : null}
</div>
```

### Styling Notes

- Tooltip uses dark slate (`bg-slate-900`, `border-slate-700`, `text-slate-100`) for contrast against light canvas background
- Minimum width of 260px ensures readability; content truncates if labels are very long
- Padding (`p-3`) and gap (`gap-2`) match existing design system spacing
- Shadow (`shadow-lg`) lifts the tooltip visually above the canvas
- Border radius (`rounded-lg`) matches node shell styling

---

## Error Handling & Edge Cases

### Missing Data
- Optional numeric fields (cpu, memory, disk) render as `—` if undefined or null
- Optional string fields (ipAddress, host, cluster) render as `—` if not present
- Tags section only renders if the array exists and has length > 0
- Status and name are required (always present in valid node data)

### Positioning Edge Cases
- Tooltip is positioned absolute relative to the node container, so it stays with the node during panning/zooming
- If a node is near the canvas edge, the tooltip may clip or extend beyond the visible area
  - **Acceptable for v1:** User can pan the canvas to see the full tooltip
  - **Future enhancement:** Implement smart repositioning (move to bottom-left if top-right clips)
- Tooltip is `z-50` so it renders above other nodes and UI

### Interaction Edge Cases
- **Rapid hover-unhover:** Timeout is cleared, no phantom tooltip appears
- **Dragging a node while hovering:** React Flow's drag system triggers `onMouseDown`, which implicitly ends the hover. Tooltip may persist until drag ends, then clears on drop — acceptable (brief visual flicker, no functional impact)
- **Touch on mobile:** Touch events don't trigger hover, so tooltip won't appear. This is acceptable because:
  - Mobile viewport has the detail panel for rich data
  - Touch interactions (drag, tap) take priority
- **Rapid node re-layout (filter change, auto-layout):** If the topology re-renders and the node ID changes, the tooltip state resets (React's key reconciliation) — acceptable and desired

### Data Assumptions
- All string fields are sanitized upstream (no HTML/XSS risk from node data)
- Numeric fields (cpu, memory, disk) are always numbers if present, never strings
- No circular references in the data structure

---

## Testing Strategy

### Unit Tests (VMNodeTooltip)
- ✓ Renders all label-value fields when data is complete
- ✓ Renders `—` for missing optional fields
- ✓ Renders tags as individual chip elements when present
- ✓ Doesn't render tags section when tags array is empty or undefined
- ✓ Applies correct CSS classes for styling
- ✓ Handles long values with truncation

### Integration Tests (VirtualMachineNode + Tooltip)
- ✓ Tooltip is hidden initially
- ✓ Tooltip appears after exactly 500ms of hovering
- ✓ Tooltip disappears immediately on `onMouseLeave`
- ✓ Rapid hover-unhover (< 500ms) does not show tooltip
- ✓ Hovering again after tooltip was hidden resets the 500ms timer
- ✓ Tooltip displays correct data for the hovered node
- ✓ Unmounting the node clears the timeout (no memory leak)

### Manual Verification
- [ ] Open Infrastructure Topology with the full dataset
- [ ] Hover over a VM node for 500ms → tooltip appears in top-right corner
- [ ] Verify all fields display correctly (name, status, cpu, memory, disk, ip, host, cluster)
- [ ] Verify tags render as chips (not a bullet list)
- [ ] Move mouse away → tooltip disappears immediately (no delay)
- [ ] Hover again immediately → tooltip appears after 500ms (timer resets)
- [ ] Hover over a node with missing optional fields → verify `—` is shown
- [ ] Hover over a node with no tags → verify tags section is not rendered
- [ ] Test on mobile viewport (touch-simulated in DevTools) → tooltip should not appear (acceptable)
- [ ] Test near canvas edges → verify tooltip doesn't break layout or is readable after panning

---

## Dependencies & Scope

**New Dependencies:** None. Uses existing React, Tailwind, and React Flow.

**Scope:**
- 2 files (1 new, 1 modified)
- ~150 lines of code (component + integration)
- No API changes, no database changes, no breaking changes
- Isolated feature: can be toggled or removed without affecting other functionality

---

## Future Enhancements

Not in scope for this phase, but worth noting:
- Smart tooltip positioning (reposition to bottom-left if top-right clips)
- Keyboard navigation (show tooltip via keyboard focus on node)
- Copy-to-clipboard buttons for IP, host, cluster
- Tooltip for other node types (Host, Cluster, Datastore)
- Touch-long-press alternative for mobile

---

## Definition of Done

- [ ] `VMNodeTooltip.tsx` component written and tested
- [ ] `VirtualMachineNode.tsx` modified to integrate tooltip and manage hover state
- [ ] Unit tests for tooltip component pass
- [ ] Integration tests for VM node + tooltip pass
- [ ] Build succeeds without warnings
- [ ] Manual verification checklist completed
- [ ] No accessibility regressions (keyboard navigation still works, ARIA labels preserved)
- [ ] Code review approved
