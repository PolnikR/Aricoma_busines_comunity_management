import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { NodeProps } from '@xyflow/react'
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

  test('tooltip is hidden initially', () => {
    // @ts-expect-error - Test props are intentionally loosely typed
    render(<VirtualMachineNode {...mockNodeProps} />)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()
  })

  test('tooltip appears after 500ms of hovering', async () => {
    const user = userEvent.setup({ delay: null })
    // @ts-expect-error - Test props are intentionally loosely typed
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
    vi.useFakeTimers()

    // @ts-expect-error - Test props are intentionally loosely typed
    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // Hover over the node
    await user.hover(nodeElement)

    // Wait 600ms to show the tooltip
    vi.advanceTimersByTime(600)
    expect(screen.getByText('Name:')).toBeInTheDocument()

    // Leave the node
    await user.unhover(nodeElement)

    // Tooltip should disappear immediately (no delay)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  test('rapid hover-unhover does not show tooltip', async () => {
    const user = userEvent.setup({ delay: null })
    vi.useFakeTimers()

    // @ts-expect-error - Test props are intentionally loosely typed
    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // Hover
    await user.hover(nodeElement)

    // Unhover after 300ms (before 500ms timeout)
    vi.advanceTimersByTime(300)
    await user.unhover(nodeElement)

    // Advance time to 500ms total
    vi.advanceTimersByTime(200)

    // Tooltip should not be visible
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  test('hovering again after unhover resets the 500ms timer', async () => {
    const user = userEvent.setup({ delay: null })
    vi.useFakeTimers()

    // @ts-expect-error - Test props are intentionally loosely typed
    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // First hover, leave before timeout
    await user.hover(nodeElement)
    vi.advanceTimersByTime(300)
    await user.unhover(nodeElement)

    // Second hover
    await user.hover(nodeElement)

    // Wait 400ms (not enough for new 500ms timeout)
    vi.advanceTimersByTime(400)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    // Wait another 200ms (total 600ms from second hover)
    vi.advanceTimersByTime(200)
    expect(screen.getByText('Name:')).toBeInTheDocument()

    vi.useRealTimers()
  })

  test('tooltip displays correct VM data', async () => {
    const user = userEvent.setup({ delay: null })
    vi.useFakeTimers()

    // @ts-expect-error - Test props are intentionally loosely typed
    render(<VirtualMachineNode {...mockNodeProps} />)

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })
    await user.hover(nodeElement)
    vi.advanceTimersByTime(600)

    expect(screen.getByText('web-server-01')).toBeInTheDocument()
    expect(screen.getByText('poweredOn')).toBeInTheDocument()
    expect(screen.getByText('4 cores')).toBeInTheDocument()
    expect(screen.getByText('8 GB')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
