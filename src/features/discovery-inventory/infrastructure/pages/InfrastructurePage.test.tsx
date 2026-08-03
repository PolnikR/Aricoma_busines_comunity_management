import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useInfrastructureInventory } from '../hooks/useInfrastructureInventory'
import { InfrastructurePage } from './InfrastructurePage'
import type { DiscoveryInventory, PowerInventory } from '../../model/discoveryTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: vi.fn(),
}))
vi.mock('../hooks/useInfrastructureInventory', () => ({
  useInfrastructureInventory: vi.fn(),
}))
vi.mock('../components/InfrastructureTopologySkeleton', () => ({
  InfrastructureTopologySkeleton: () => <div>Topology loading</div>,
}))
vi.mock('../components/InfrastructureTopologyWorkspace', () => ({
  InfrastructureTopologyWorkspace: ({
    topology,
    platform,
  }: { topology: { nodes: unknown[] }; platform: string }) => (
    <div>Topology {platform}: {topology.nodes.length} nodes</div>
  ),
}))

const providers: ProviderRecord[] = [
  { id: 'vcenter-01', name: 'vCenter', description: '', type: 'VMWARE', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
  { id: 'power-01', name: 'Power', description: '', type: 'IBM_POWER', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
]

const vmwareInventory: DiscoveryInventory = {
  reportedCount: 1,
  virtualMachines: [{
    id: 'vm-1', name: 'WEB-01', powerState: 'poweredOn', connectionState: 'connected',
    guestOs: 'Linux', hostname: 'web-01', ipAddress: '10.0.0.1', vcpu: 2, memoryGb: 4,
    host: 'esx-01', cluster: 'cluster-01', primaryDatastore: 'datastore-01',
    folder: 'Applications', vmPath: '[datastore-01] web-01/web-01.vmx', providerId: 'vcenter-01',
    providerType: 'VMWARE', disks: [], snapshotCount: 0, toolsStatus: 'toolsOk', tags: [],
  }],
}

const powerInventory: PowerInventory = {
  reportedCount: 1,
  countsByType: { LogicalPartition: 1, VirtualIOServer: 0 },
  virtualMachines: [],
  partitions: [{
    id: 'power-01:LPAR:p1', providerId: 'power-01', providerType: 'IBM_POWER', partitionKind: 'LPAR',
    partitionData: {}, lpar: {}, vios: {}, partitionName: 'Payments', partitionState: 'running',
    systemName: 'Power System A', operatingSystemType: 'AIX', deviceName: '', bootMode: 'Normal',
    powerOnWithHypervisor: 'true', volumeCapacity: '', volumeName: '', volumeState: '',
  }],
}

let providerQueryOverrides: Record<string, unknown>
let inventoryQueryOverrides: Record<string, unknown>

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function renderPage(entry = '/discovery-inventory/infrastructure') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <InfrastructurePage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  providerQueryOverrides = {}
  inventoryQueryOverrides = {}
  vi.clearAllMocks()
  vi.mocked(useProviders).mockImplementation(() => ({
    data: providers,
    error: null,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
    ...providerQueryOverrides,
  }) as unknown as ReturnType<typeof useProviders>)
  vi.mocked(useInfrastructureInventory).mockImplementation((provider) => ({
    data: provider?.type === 'IBM_POWER' ? powerInventory : vmwareInventory,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...inventoryQueryOverrides,
  }) as unknown as ReturnType<typeof useInfrastructureInventory>)
})

describe('InfrastructurePage', () => {
  it('renders provider loading and retryable error states', async () => {
    providerQueryOverrides = { data: undefined, isLoading: true, isSuccess: false }
    const { rerender } = renderPage()
    expect(screen.getByText('Topology loading')).toBeInTheDocument()

    const refetch = vi.fn()
    providerQueryOverrides = {
      data: undefined,
      isLoading: false,
      isSuccess: false,
      error: new Error('offline'),
      refetch,
    }
    rerender(
      <MemoryRouter>
        <InfrastructurePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('offline')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('maps VMware inventory to topology and refreshes it', async () => {
    const refetch = vi.fn()
    inventoryQueryOverrides = { refetch }
    renderPage()

    expect(await screen.findByText(/Topology vmware:/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh inventory' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('canonicalizes an incompatible provider and maps IBM Power topology', async () => {
    renderPage('/discovery-inventory/infrastructure?platform=ibm-power&providerId=vcenter-01')

    expect(await screen.findByText('Topology ibm-power: 2 nodes')).toBeInTheDocument()
    expect(useInfrastructureInventory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'power-01', type: 'IBM_POWER' }),
    )
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('platform=ibm-power')
      expect(screen.getByTestId('location')).toHaveTextContent('providerId=power-01')
    })
  })

  it('switches platform together with its compatible provider', async () => {
    const user = userEvent.setup()
    renderPage('/discovery-inventory/infrastructure?platform=vmware&providerId=vcenter-01')

    await user.selectOptions(screen.getByLabelText('Platform'), 'ibm-power')

    expect(await screen.findByText('Topology ibm-power: 2 nodes')).toBeInTheDocument()
    expect(screen.getByLabelText('Provider')).toHaveValue('power-01')
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('providerId=power-01')
    })
  })
})
