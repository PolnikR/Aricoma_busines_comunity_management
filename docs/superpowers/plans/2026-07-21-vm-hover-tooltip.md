# VM Hover Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement hover tooltips showing VM details (name, status, CPU, memory, host, cluster) when users hover over VM nodes in the infrastructure topology diagram.

**Architecture:** A new `VMNodeTooltip` component renders rich VM details in a dark card positioned at the top-right of a node. The `VirtualMachineNode` component manages hover state using `useState` (for visibility) and `useRef` (for timeout), triggering the tooltip after a 500ms delay. The tooltip uses vertical label-value pairs and renders tags as chips. On unmount, the timeout is cleaned up to prevent memory leaks.

**Tech Stack:** React, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`), no new npm dependencies.

---

## Global Constraints

- **Hover delay:** Exactly 500ms before tooltip appears
- **Positioning:** Fixed to top-right of the VM node (absolute positioned)
- **Layout:** Vertical label-value pairs (label: value on each line)
- **Tags:** Rendered as individual chips/badges (not a comma-separated list)
- **Missing fields:** Render as `—` (em-dash)
- **No new dependencies:** Use only existing packages (React, Tailwind, React Flow)
- **Styling:** Match existing design system (dark slate palette, consistent spacing)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---|
| `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.tsx` | Create | Tooltip component: renders VM details as vertical list with Field helper for label-value pairs and conditional tags section |
| `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.tsx` | Modify | Add hover state (useState + useRef), event handlers (onMouseEnter/Leave), timeout management, and conditional tooltip rendering |
| `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx` | Create | Unit tests for tooltip rendering, missing data handling, tags rendering |
| `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.test.tsx` | Create | Integration tests for hover timing, state management, cleanup |

---

## Task 1: Create VMNodeTooltip Component

**Files:**
- Create: `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.tsx`
- Create: `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx`

**Interfaces:**
- Consumes: Nothing (receives props with VM data)
- Produces: 
  - `VMNodeTooltip` React component
  - `VMNodeTooltipProps` TypeScript interface

---

### Step 1.1: Write failing tests for VMNodeTooltip

Create `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { VMNodeTooltip, type VMNodeTooltipProps } from './VMNodeTooltip'

describe('VMNodeTooltip', () => {
  const defaultProps: VMNodeTooltipProps = {
    data: {
      name: 'app-server-01',
      status: 'powered on',
      cpu: 4,
      memory: 8,
      disk: 100,
      ipAddress: '10.0.0.10',
      host: 'esx-01',
      cluster: 'prod-cluster',
      tags: [],
    },
  }

  test('renders all label-value pairs when data is complete', () => {
    render(<VMNodeTooltip {...defaultProps} />)
    expect(screen.getByText('Name:')).toBeInTheDocument()
    expect(screen.getByText('app-server-01')).toBeInTheDocument()
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('powered on')).toBeInTheDocument()
    expect(screen.getByText('CPU:')).toBeInTheDocument()
    expect(screen.getByText('4 cores')).toBeInTheDocument()
    expect(screen.getByText('Memory:')).toBeInTheDocument()
    expect(screen.getByText('8 GB')).toBeInTheDocument()
  })

  test('renders — for missing optional fields', () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'simple-vm',
        status: 'powered off',
      },
    }
    render(<VMNodeTooltip {...props} />)
    expect(screen.getByText('IP:')).toBeInTheDocument()
    // The next sibling of the IP label should be the em-dash
    const ipLabel = screen.getByText('IP:')
    expect(ipLabel.parentElement?.textContent).toContain('—')
  })

  test('renders tags as individual chip elements', () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'tagged-vm',
        status: 'powered on',
        tags: ['production', 'critical', 'monitored'],
      },
    }
    render(<VMNodeTooltip {...props} />)
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('monitored')).toBeInTheDocument()
  })

  test('does not render tags section when tags array is empty', () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'no-tags-vm',
        status: 'powered on',
        tags: [],
      },
    }
    render(<VMNodeTooltip {...props} />)
    // The parent div that would contain "Tags" label should not exist
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  test('does not render tags section when tags is undefined', () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'no-tags-vm',
        status: 'powered on',
      },
    }
    render(<VMNodeTooltip {...props} />)
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  test('applies correct CSS classes for styling', () => {
    const { container } = render(<VMNodeTooltip {...defaultProps} />)
    const wrapper = container.querySelector('.bg-slate-900')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('absolute', 'top-0', 'right-0', 'z-50', 'rounded-lg', 'shadow-lg')
  })
})
```

- [ ] **Step 1.1: Save the test file**

---

### Step 1.2: Run tests to verify they fail

Run: `npm test -- src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx`

Expected output: Multiple failures like "VMNodeTooltip" cannot be found, "VMNodeTooltipProps" does not exist.

- [ ] **Step 1.2: Confirm test failures**

---

### Step 1.3: Implement VMNodeTooltip component

Create `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.tsx`:

```typescript
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="ml-2 truncate text-slate-100">{value}</span>
    </div>
  )
}

export function VMNodeTooltip({ data }: VMNodeTooltipProps) {
  return (
    <div className="absolute top-0 right-0 z-50 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-lg min-w-[260px]">
      <div className="space-y-2">
        <Field label="Name" value={data.name} />
        <Field label="Status" value={data.status} />
        {data.cpu !== undefined && <Field label="CPU" value={`${data.cpu} cores`} />}
        {data.cpu === undefined && <Field label="CPU" value="—" />}
        {data.memory !== undefined && <Field label="Memory" value={`${data.memory} GB`} />}
        {data.memory === undefined && <Field label="Memory" value="—" />}
        {data.disk !== undefined && <Field label="Disk" value={`${data.disk} GB`} />}
        {data.disk === undefined && <Field label="Disk" value="—" />}
        <Field label="IP" value={data.ipAddress || '—'} />
        <Field label="Host" value={data.host || '—'} />
        <Field label="Cluster" value={data.cluster || '—'} />

        {data.tags && data.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block rounded bg-slate-700 px-2 py-1 text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export type { VMNodeTooltipProps }
```

- [ ] **Step 1.3: Save the component file**

---

### Step 1.4: Run tests to verify they pass

Run: `npm test -- src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx`

Expected output: All tests pass (6 passing).

- [ ] **Step 1.4: Confirm test passes**

---

### Step 1.5: Commit

```bash
git add src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.tsx src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx
git commit -m "feat: add VMNodeTooltip component for displaying VM details

- New component renders VM metadata (name, status, CPU, memory, disk, IP, host, cluster)
- Shows optional fields as em-dash when not present
- Renders tags as individual chip elements
- Uses vertical label-value pair layout
- Styled with dark slate palette and positioned absolutely
- Full unit test coverage for all rendering scenarios"
```

- [ ] **Step 1.5: Commit the tooltip component**

---

## Task 2: Modify VirtualMachineNode to Add Hover State and Integrate Tooltip

**Files:**
- Modify: `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.tsx`
- Create: `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.test.tsx`

**Interfaces:**
- Consumes: `VMNodeTooltip` component and `VMNodeTooltipProps` interface (from Task 1)
- Produces: Modified `VirtualMachineNode` that manages hover state and renders tooltip conditionally

---

### Step 2.1: Write failing tests for VirtualMachineNode hover behavior

Create `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NodeProps } from '@xyflow/react'
import { VirtualMachineNode } from './VirtualMachineNode'
import type { VirtualMachineTopologyNode } from '../../model/topologyTypes'

describe('VirtualMachineNode with Tooltip', () => {
  const mockNodeData: VirtualMachineTopologyNode = {
    id: 'vm-1',
    kind: 'virtualMachine',
    label: 'web-server-01',
    virtualMachineId: 'vm-123',
    powerState: 'poweredOn',
    connectionState: 'connected',
    hostName: 'esx-01.prod.local',
    clusterName: 'prod-cluster',
    folder: '/Datacenters/DC1',
    vcpu: 4,
    memoryGb: 8,
  }

  const mockNodeProps: NodeProps = {
    id: 'vm-1',
    data: mockNodeData,
    type: 'virtualMachine',
    selected: false,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    dragging: false,
  }

  test('tooltip is hidden initially', () => {
    render(<VirtualMachineNode {...mockNodeProps} />)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()
  })

  test('tooltip appears after 500ms of hovering', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // Hover over the node
    await user.hover(nodeElement)

    // Tooltip should not be visible immediately
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    // Wait for 500ms and check if tooltip appears
    await waitFor(
      () => {
        expect(screen.getByText('Name:')).toBeInTheDocument()
      },
      { timeout: 700 } // Give it 700ms to be safe
    )
  })

  test('tooltip disappears immediately on mouse leave', async () => {
    const user = userEvent.setup({ delay: null })
    jest.useFakeTimers()

    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // Hover over the node
    await user.hover(nodeElement)

    // Wait 600ms to show the tooltip
    jest.advanceTimersByTime(600)
    expect(screen.getByText('Name:')).toBeInTheDocument()

    // Leave the node
    await user.unhover(nodeElement)

    // Tooltip should disappear immediately (no delay)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    jest.useRealTimers()
  })

  test('rapid hover-unhover does not show tooltip', async () => {
    const user = userEvent.setup({ delay: null })
    jest.useFakeTimers()

    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // Hover
    await user.hover(nodeElement)

    // Unhover after 300ms (before 500ms timeout)
    jest.advanceTimersByTime(300)
    await user.unhover(nodeElement)

    // Advance time to 500ms total
    jest.advanceTimersByTime(200)

    // Tooltip should not be visible
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    jest.useRealTimers()
  })

  test('hovering again after unhover resets the 500ms timer', async () => {
    const user = userEvent.setup({ delay: null })
    jest.useFakeTimers()

    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // First hover, leave before timeout
    await user.hover(nodeElement)
    jest.advanceTimersByTime(300)
    await user.unhover(nodeElement)

    // Second hover
    await user.hover(nodeElement)

    // Wait 400ms (not enough for new 500ms timeout)
    jest.advanceTimersByTime(400)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    // Wait another 200ms (total 600ms from second hover)
    jest.advanceTimersByTime(200)
    expect(screen.getByText('Name:')).toBeInTheDocument()

    jest.useRealTimers()
  })

  test('tooltip displays correct VM data', async () => {
    const user = userEvent.setup({ delay: null })
    jest.useFakeTimers()

    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })
    await user.hover(nodeElement)
    jest.advanceTimersByTime(600)

    expect(screen.getByText('web-server-01')).toBeInTheDocument()
    expect(screen.getByText('poweredOn')).toBeInTheDocument()
    expect(screen.getByText('4 cores')).toBeInTheDocument()
    expect(screen.getByText('8 GB')).toBeInTheDocument()

    jest.useRealTimers()
  })
})
```

- [ ] **Step 2.1: Save the test file**

---

### Step 2.2: Run tests to verify they fail

Run: `npm test -- src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.test.tsx`

Expected output: Multiple failures because VirtualMachineNode doesn't have hover state or tooltip rendering yet.

- [ ] **Step 2.2: Confirm test failures**

---

### Step 2.3: Modify VirtualMachineNode to add hover state and tooltip

Update `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.tsx`:

```typescript
import { useEffect, useRef, useState, memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { CpuIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import type { VirtualMachineTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { VMNodeTooltip } from './VMNodeTooltip'

type VirtualMachineFlowNode = Node<
  VirtualMachineTopologyNode & Record<string, unknown>,
  'virtualMachine'
>

export const VirtualMachineNode = memo(function VirtualMachineNode({
  data,
  selected,
}: NodeProps<VirtualMachineFlowNode>) {
  const poweredOn = data.powerState === 'poweredOn'
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <TopologyNodeShell
        kindLabel="Virtual machine"
        title={data.label}
        subtitle={data.hostName}
        icon={<CpuIcon className="size-5" />}
        iconClassName={poweredOn
          ? 'bg-success-50 text-success-700'
          : 'bg-gray-100 text-gray-600'}
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="flex items-center justify-between gap-2 text-[10px]">
          <span className={cn(
            'inline-flex items-center gap-1.5 font-semibold',
            poweredOn ? 'text-success-700' : 'text-gray-600',
          )}>
            <span className={cn(
              'size-1.5 rounded-full',
              poweredOn ? 'bg-success-500' : 'bg-gray-400',
            )}
            />
            {poweredOn ? 'Powered on' : 'Powered off'}
          </span>
          <span className="truncate text-[#687991]">{data.connectionState}</span>
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <VMNodeTooltip
          data={{
            name: data.label,
            status: data.powerState,
            cpu: data.vcpu,
            memory: data.memoryGb,
            host: data.hostName,
            cluster: data.clusterName,
            // Note: disk, ipAddress, and tags are not currently in VirtualMachineTopologyNode
            // If these fields are added to the topology type, they can be passed here
          }}
        />
      ) : null}
    </div>
  )
})
```

- [ ] **Step 2.3: Save the modified component**

---

### Step 2.4: Run tests to verify they pass

Run: `npm test -- src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.test.tsx`

Expected output: All tests pass (6 passing).

- [ ] **Step 2.4: Confirm tests pass**

---

### Step 2.5: Run the full infrastructure test suite

Run: `npm test -- src/features/discovery-inventory/infrastructure`

Expected output: All existing and new tests pass. (If there are failures in existing tests, they likely need `jest.useFakeTimers()` + `jest.useRealTimers()` adjustments in those tests as well.)

- [ ] **Step 2.5: Confirm full infrastructure tests pass**

---

### Step 2.6: Build to check for TypeScript errors

Run: `npm run build`

Expected output: Build succeeds without errors.

- [ ] **Step 2.6: Confirm build succeeds**

---

### Step 2.7: Commit

```bash
git add src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.tsx src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.test.tsx
git commit -m "feat: add hover tooltip to VirtualMachineNode

- Add useState for tooltip visibility, useRef for timeout management
- Implement 500ms hover delay using setTimeout
- Clear timeout and hide tooltip immediately on mouse leave
- Cleanup timeout on component unmount to prevent memory leaks
- Integrate VMNodeTooltip component with VM data mapping
- Comprehensive test coverage for hover timing and state management"
```

- [ ] **Step 2.7: Commit the hover logic**

---

## Task 3: Manual Verification in Browser

**Files:**
- No new files

**Interfaces:**
- Tests: All previous tasks

---

### Step 3.1: Start the development server

Run: `npm run dev`

Expected output: Application starts, no errors in console.

- [ ] **Step 3.1: Dev server running**

---

### Step 3.2: Open Infrastructure Topology page

Navigate to the Infrastructure Topology page in your local application.

- [ ] **Step 3.2: Page loaded**

---

### Step 3.3: Verify tooltip appears on hover

1. Locate a VM node in the topology diagram
2. Hover over the VM node with your mouse
3. Count to approximately 0.5 seconds
4. Verify the tooltip appears in the top-right corner of the node

Expected: Tooltip shows name, status (powered on/off), CPU cores, memory GB, host, and cluster.

- [ ] **Step 3.3: Tooltip appears after 500ms**

---

### Step 3.4: Verify tooltip disappears on mouse leave

1. Keep the mouse hovering over a VM node until the tooltip appears
2. Move the mouse away from the node
3. Verify the tooltip disappears immediately (no delay)

Expected: Tooltip vanishes instantly when you move the mouse away.

- [ ] **Step 3.4: Tooltip disappears immediately on leave**

---

### Step 3.5: Verify hover timer resets

1. Hover over a VM node for 300ms, then move away
2. Immediately hover over the same node again
3. Count to 500ms and verify the tooltip appears

Expected: Timer resets on each hover, not cumulative.

- [ ] **Step 3.5: Hover timer resets correctly**

---

### Step 3.6: Verify data display

1. Look at the tooltip for a powered-on VM
2. Verify it shows:
   - Name (matches the node's title)
   - Status (e.g., "poweredOn")
   - CPU cores (numeric value with "cores")
   - Memory (numeric value with "GB")
   - Host (the ESX host name)
   - Cluster (the cluster name)

Expected: All fields are visible and match the VM's actual data.

- [ ] **Step 3.6: Data displays correctly**

---

### Step 3.7: Verify missing fields show em-dash

If available in your test data, find a VM or hover over multiple VMs to check if any have missing optional fields.

Expected: Missing fields (if any become available in future—disk, IP, tags) show as `—` instead of blank.

- [ ] **Step 3.7: Missing fields handled correctly**

---

### Step 3.8: Test near canvas edges

1. Pan the canvas so a VM node is near the right or bottom edge
2. Hover over that node to show the tooltip
3. Verify the tooltip is still readable (it may overlap other nodes, but that's acceptable for v1)

Expected: Tooltip renders and is not cut off by the canvas boundary. (If it clips, user can pan to see it.)

- [ ] **Step 3.8: Edge case positioning works**

---

### Step 3.9: Verify no console errors

Open your browser's Developer Tools (F12) and check the Console tab.

Expected: No errors, warnings, or TypeScript type issues related to the tooltip.

- [ ] **Step 3.9: No console errors**

---

### Step 3.10: Final commit for verification

No code changes, just document that manual verification is complete:

```bash
git log --oneline -5
```

Expected: Your last two commits should be the VMNodeTooltip and VirtualMachineNode changes.

- [ ] **Step 3.10: Manual verification complete**

---

## Checkpoint: Feature Complete

- [ ] VMNodeTooltip component created and tested
- [ ] VirtualMachineNode integrated with hover state and tooltip
- [ ] All unit and integration tests pass
- [ ] Build succeeds without errors
- [ ] Manual verification in browser completed
- [ ] No console errors or warnings

**Next Steps:**
- Feature is ready for code review
- If additional fields (disk, IP, tags) are added to VirtualMachineTopologyNode in the future, the tooltip implementation can be extended by updating the data mapping in VirtualMachineNode (Steps 2.3) and adding tests

---

## Notes for Implementer

### Data Availability

The current `VirtualMachineTopologyNode` type includes:
- `label` (mapped to Name)
- `powerState` (mapped to Status)
- `vcpu` (mapped to CPU cores)
- `memoryGb` (mapped to Memory)
- `hostName` (mapped to Host)
- `clusterName` (mapped to Cluster)

The design spec references additional fields (disk, ipAddress, tags) that are not currently in the topology node type. If these fields become available, update the data mapping in `VirtualMachineNode.tsx` (Step 2.3) to include them.

### Timer Management

The timeout ref is critical for preventing memory leaks. Always clear the timeout:
1. Before setting a new one (in `handleMouseLeave`)
2. On component unmount (in the `useEffect` cleanup)
3. Before unhooking the component (React's reconciliation handles this, but explicit cleanup is safer)

### Testing Notes

- Unit tests for `VMNodeTooltip` use `@testing-library/react`
- Integration tests for `VirtualMachineNode` use `jest.useFakeTimers()` to control time and avoid flaky tests based on real delays
- Always restore real timers with `jest.useRealTimers()` in a finally block or test cleanup

### Styling

The tooltip uses Tailwind classes for styling. If the design system colors change, update:
- Background: `bg-slate-900` → adjust to new dark background
- Border: `border-slate-700`
- Text: `text-slate-100` (bright text on dark background)
- Accent text: `text-slate-400` (labels)

All color decisions should be made with both light and dark mode in mind, but the current implementation uses a fixed dark palette because the canvas background is light (`bg-[#f8fbfe]`).
