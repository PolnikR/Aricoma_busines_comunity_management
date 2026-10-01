import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InfrastructureTopologyWorkspace } from './InfrastructureTopologyWorkspace'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
import { layoutInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import type {
  InfrastructureTopology,
  VirtualMachineTopologyNode,
} from '../model/topologyTypes'

vi.mock('../layout/layoutInfrastructureTopology', () => ({
  layoutInfrastructureTopology: vi.fn(),
}))
vi.mock('../hooks/useTopologyNodePositionOverrides', () => ({
  useTopologyNodePositionOverrides: () => ({
    overrides: {},
    setOverride: vi.fn(),
    clearOverrides: vi.fn(),
  }),
}))
vi.mock('./InfrastructureTopologyCanvas', () => ({
  InfrastructureTopologyCanvas: () => <div>Topology canvas</div>,
}))
vi.mock('./InfrastructureTopologyToolbar', () => ({
  InfrastructureTopologyToolbar: () => <div>Topology toolbar</div>,
}))
vi.mock('./InfrastructureTopologyLegend', () => ({
  InfrastructureTopologyLegend: ({ visibleNodes }: { visibleNodes: number }) => (
    <div>Visible nodes: {visibleNodes}</div>
  ),
}))

const virtualMachineNode: VirtualMachineTopologyNode = {
  id: 'vm-1',
  kind: 'virtualMachine',
  label: 'VM-1',
  virtualMachineId: 'vm-1',
  powerState: 'poweredOn',
  connectionState: 'connected',
  hostName: '',
  clusterName: '',
  folder: '',
  vcpu: 2,
  memoryGb: 4,
}

const topology: InfrastructureTopology = {
  nodes: [virtualMachineNode],
  edges: [],
}

describe('InfrastructureTopologyWorkspace', () => {
  it('layouts the filtered topology and renders the canvas', async () => {
    vi.mocked(layoutInfrastructureTopology).mockResolvedValue({
      nodes: [{
        node: virtualMachineNode,
        position: { x: 0, y: 0 },
        size: { width: 260, height: 132 },
      }],
      edges: [],
      size: { width: 260, height: 132 },
    })

    render(<InfrastructureTopologyWorkspace platform="vmware" topology={topology} />)
    expect(screen.getByRole('status')).toHaveTextContent('Arranging topology')
    await waitFor(() => { expect(screen.getByText('Topology canvas')).toBeInTheDocument() })
    expect(screen.getByText('Visible nodes: 1')).toBeInTheDocument()
  })

  it('keeps a desktop floor for the canvas while the mobile card stays viewport-sized', async () => {
    vi.mocked(layoutInfrastructureTopology).mockResolvedValue({
      nodes: [{
        node: virtualMachineNode,
        position: { x: 0, y: 0 },
        size: { width: 260, height: 132 },
      }],
      edges: [],
      size: { width: 260, height: 132 },
    })

    render(<InfrastructureTopologyWorkspace platform="vmware" topology={topology} />)
    const canvasRegion = (await screen.findByText('Topology canvas')).parentElement
    const card = screen.getByText('Topology toolbar').parentElement

    expect(canvasRegion).toHaveClass('relative', 'min-h-0', 'flex-1', 'overflow-hidden', 'lg:min-h-[260px]')
    // min-content keeps toolbar + canvas floor + legend; the overflow-hidden card would otherwise shrink to 0.
    expect(card).toHaveClass('h-dvh', 'min-h-0', 'overflow-hidden', 'lg:h-auto', 'lg:flex-1', 'lg:min-h-min')
    expect(card).not.toHaveClass('lg:min-h-0')
  })

  it('shows layout failures', async () => {
    vi.mocked(layoutInfrastructureTopology).mockRejectedValue(new Error('ELK failed'))
    render(<InfrastructureTopologyWorkspace platform="vmware" topology={topology} />)
    await waitFor(() => { expect(screen.getByRole('alert')).toHaveTextContent('ELK failed') })
  })
})
