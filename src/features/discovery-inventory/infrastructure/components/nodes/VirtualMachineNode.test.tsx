import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { NodeProps } from '@xyflow/react'
import { ReactFlowProvider } from '@xyflow/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { VirtualMachineNode } from './VirtualMachineNode'
import type { VirtualMachineTopologyNode } from '../../model/topologyTypes'

describe('VirtualMachineNode with Tooltip', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

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
      <LanguageProvider>
        <ReactFlowProvider>
          {/* @ts-expect-error - Test props are intentionally loosely typed */}
          <VirtualMachineNode {...mockNodeProps} />
        </ReactFlowProvider>
      </LanguageProvider>,
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
    // Use findByText which waits for both translation loading and tooltip appearance
    await expect(screen.findByText('Name:', {}, { timeout: 700 })).resolves.toBeInTheDocument()
  })

  test('tooltip disappears immediately on mouse leave', async () => {
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    fireEvent.mouseEnter(nodeElement)

    // Wait for tooltip to appear
    await waitFor(
      () => {
        expect(screen.getByText('Name:')).toBeInTheDocument()
      },
      { timeout: 700 }
    )

    fireEvent.mouseLeave(nodeElement)
    // Tooltip should disappear immediately (no delay)
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()
  })

  test('rapid hover-unhover does not show tooltip', async () => {
    const user = userEvent.setup({ delay: null })
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    await user.hover(nodeElement)
    // Wait 300ms - before the 500ms timeout
    await new Promise(resolve => setTimeout(resolve, 300))
    await user.unhover(nodeElement)
    // Wait another 200ms - 500ms total, but hover was already cancelled
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(screen.queryByText('Name:')).not.toBeInTheDocument()
  })

  test('hovering again after unhover resets the 500ms timer', async () => {
    const user = userEvent.setup({ delay: null })
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })

    // First hover, leave before tooltip timeout
    await user.hover(nodeElement)
    // Wait a bit but less than 500ms
    await new Promise(resolve => setTimeout(resolve, 300))
    await user.unhover(nodeElement)

    // Second hover should reset the timer
    await user.hover(nodeElement)

    // Wait another 400ms - still not enough for a fresh 500ms
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()

    // Wait another 200ms to reach 600ms from the second hover
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(await screen.findByText('Name:')).toBeInTheDocument()
  })

  test('tooltip displays correct VM data', async () => {
    const user = userEvent.setup({ delay: null })
    renderNode()

    const nodeElement = screen.getByRole('group', { name: /Virtual machine/ })
    await user.hover(nodeElement)

    // Wait for tooltip to appear with the data
    const coresText = await screen.findByText('4 cores')
    expect(coresText).toBeInTheDocument()

    // The node label also shows the name, so scope assertions to the tooltip.
    const tooltip = document.querySelector('.bg-slate-900')
    expect(tooltip).not.toBeNull()
    const inTooltip = within(tooltip as HTMLElement)
    expect(inTooltip.getByText('web-server-01')).toBeInTheDocument()
    expect(inTooltip.getByText('poweredOn')).toBeInTheDocument()
    expect(inTooltip.getByText('4 cores')).toBeInTheDocument()
    expect(inTooltip.getByText('8 GB')).toBeInTheDocument()
  })
})
