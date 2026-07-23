import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { NodeProps } from '@xyflow/react'
import { ReactFlowProvider } from '@xyflow/react'
import { VirtualMachineNode } from './VirtualMachineNode'
import type { VirtualMachineTopologyNode } from '../../model/topologyTypes'

describe('VirtualMachineNode with Tooltip', () => {
  afterEach(cleanup)
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

  const mockNodeProps = {
    id: 'vm-1',
    data: mockNodeData,
    type: 'virtualMachine',
    selected: false,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    draggable: true,
  } as unknown as NodeProps

  function renderNode() {
    return render(
      <ReactFlowProvider>
        {/* @ts-expect-error - Test props are intentionally loosely typed */}
        <VirtualMachineNode {...mockNodeProps} />
      </ReactFlowProvider>,
    )
  }

  test('tooltip is hidden initially', () => {
    renderNode()
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()
  })

  test('tooltip appears after 500ms of hovering', async () => {
    const user = userEvent.setup({ delay: null })
    renderNode()

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

  test('tooltip disappears immediately on mouse leave', () => {
    vi.useFakeTimers()
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    fireEvent.mouseEnter(nodeElement)
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.getByText('Name:')).toBeInTheDocument()

    fireEvent.mouseLeave(nodeElement)
    // Tooltip should disappear immediately (no delay)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  test('rapid hover-unhover does not show tooltip', () => {
    vi.useFakeTimers()
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    fireEvent.mouseEnter(nodeElement)
    act(() => { vi.advanceTimersByTime(300) }) // before the 500ms timeout
    fireEvent.mouseLeave(nodeElement)
    act(() => { vi.advanceTimersByTime(200) }) // 500ms total

    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  test('hovering again after unhover resets the 500ms timer', () => {
    vi.useFakeTimers()
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // First hover, leave before timeout
    fireEvent.mouseEnter(nodeElement)
    act(() => { vi.advanceTimersByTime(300) })
    fireEvent.mouseLeave(nodeElement)

    // Second hover resets the timer
    fireEvent.mouseEnter(nodeElement)
    act(() => { vi.advanceTimersByTime(400) }) // not enough for a fresh 500ms
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(200) }) // 600ms from the second hover
    expect(screen.getByText('Name:')).toBeInTheDocument()

    vi.useRealTimers()
  })

  test('tooltip displays correct VM data', () => {
    vi.useFakeTimers()
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })
    fireEvent.mouseEnter(nodeElement)
    act(() => { vi.advanceTimersByTime(600) })

    // The node label also shows the name, so scope assertions to the tooltip.
    const tooltip = document.querySelector('.bg-slate-900')
    expect(tooltip).not.toBeNull()
    const inTooltip = within(tooltip as HTMLElement)
    expect(inTooltip.getByText('web-server-01')).toBeInTheDocument()
    expect(inTooltip.getByText('poweredOn')).toBeInTheDocument()
    expect(inTooltip.getByText('4 cores')).toBeInTheDocument()
    expect(inTooltip.getByText('8 GB')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
