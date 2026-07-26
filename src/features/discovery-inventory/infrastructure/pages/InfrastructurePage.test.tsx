import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { InfrastructurePage } from './InfrastructurePage'
import type { DiscoveryInventory } from '../../model/discoveryTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/api/useDiscoveryInventory', () => ({
  useDiscoveryInventory: vi.fn(),
}))
vi.mock('../components/InfrastructureTopologySkeleton', () => ({
  InfrastructureTopologySkeleton: () => <div>Topology loading</div>,
}))
vi.mock('../components/InfrastructureTopologyWorkspace', () => ({
  InfrastructureTopologyWorkspace: ({ topology }: { topology: { nodes: unknown[] } }) => (
    <div>Topology nodes: {topology.nodes.length}</div>
  ),
}))

const inventory: DiscoveryInventory = {
  reportedCount: 1,
  virtualMachines: [{
    id: 'vm-1',
    name: 'WEB-01',
    powerState: 'poweredOn',
    connectionState: 'connected',
    guestOs: 'Linux',
    hostname: 'web-01',
    ipAddress: '10.0.0.1',
    vcpu: 2,
    memoryGb: 4,
    host: 'esx-01',
    cluster: 'cluster-01',
    primaryDatastore: 'datastore-01',
    folder: 'Applications',
    vmPath: '[datastore-01] web-01/web-01.vmx',
    providerId: 'vcenter-01',
    providerType: 'VMWARE',
    disks: [],
    snapshotCount: 0,
    toolsStatus: 'toolsOk',
    tags: [],
  }],
}

function mockQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useDiscoveryInventory).mockReturnValue({
    data: inventory,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useDiscoveryInventory>)
}

beforeEach(() => {
  mockQuery()
})

describe('InfrastructurePage', () => {
  it('renders loading and retryable error states', async () => {
    mockQuery({ data: undefined, isLoading: true })
    const { rerender } = render(<InfrastructurePage />)
    expect(screen.getByText('Topology loading')).toBeInTheDocument()

    const refetch = vi.fn()
    mockQuery({ data: undefined, isLoading: false, error: new Error('offline'), refetch })
    rerender(<InfrastructurePage />)
    expect(screen.getByText('offline')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('maps inventory to topology and refreshes it', async () => {
    const refetch = vi.fn()
    mockQuery({ refetch })
    render(<InfrastructurePage />)

    expect(screen.getByText(/Topology nodes:/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh inventory' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
