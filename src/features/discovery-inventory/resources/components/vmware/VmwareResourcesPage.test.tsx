import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VmwareResourcesPage } from './VmwareResourcesPage'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { VirtualMachine } from '../../types/virtualMachineTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const provider: ProviderRecord = {
  id: 'vmware-01', name: 'VMware 01', description: '', type: 'VMWARE', ipAddress: '10.0.0.1',
  port: 22, credentialId: null, credentialStatus: 'none',
}
const vm: VirtualMachine = {
  id: 'vm-01', name: 'VM 01', powerState: 'poweredOn', connectionState: 'connected', guestOs: 'Linux',
  hostname: 'vm-01', ipAddress: '10.0.0.10', vcpu: 2, memoryGb: 4, host: 'esx-01', cluster: 'cluster-01',
  datastore: 'store-01', folder: '/', vmPath: '/vm/vm-01', providerId: provider.id, providerType: 'VMWARE',
  diskCount: 1, diskCapacityGb: 20, vdisks: [], snapshotCount: 0, toolsStatus: 'ok', tags: [],
}

let inventory: { reportedCount: number; virtualMachines: VirtualMachine[] }
let inventoryBackgroundFetching = false

vi.mock('../../hooks/useVirtualMachineSearchParams', () => ({
  useVirtualMachineSearchParams: () => ({
    query: { page: 1, pageSize: 10, search: '', powerState: '', connectionState: '', cluster: '', tags: [], untagged: false },
    updateQuery: vi.fn(), updateFilters: vi.fn(), isInitialized: true,
  }),
}))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => ({ data: [provider], error: null, isLoading: false, isSuccess: true, isFetching: false, refetch: vi.fn() }),
}))
vi.mock('../../hooks/useVmwareResourceInventory', () => ({
  useVmwareResourceInventory: () => ({
    data: inventory, isInitialLoading: false, isFetching: inventoryBackgroundFetching, isBackgroundFetching: inventoryBackgroundFetching,
    isError: false, isEmpty: inventory.virtualMachines.length === 0, refetch: vi.fn(),
  }),
}))
vi.mock('@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory', () => ({
  useVmwareResourceInventory: () => ({
    data: inventory, isInitialLoading: false, isFetching: inventoryBackgroundFetching, isBackgroundFetching: inventoryBackgroundFetching,
    isError: false, isEmpty: inventory.virtualMachines.length === 0, refetch: vi.fn(),
  }),
}))
vi.mock('../../hooks/useVmwareTags', () => ({ useTags: () => ({ data: [] }) }))
vi.mock('../../helpers/mapInventoryToVirtualMachines', () => ({
  mapInventoryToVirtualMachines: () => ({
    virtualMachines: inventory.virtualMachines,
    items: inventory.virtualMachines,
    total: inventory.virtualMachines.length,
    page: 1,
    pageSize: 10,
    pageCount: 1,
    metrics: { total: inventory.virtualMachines.length, poweredOn: 0, clusters: 0, totalCpu: 0, totalMemoryGb: 0 },
    filterOptions: { clusters: [], powerStates: [], connectionStates: [] },
  }),
}))
vi.mock('./VirtualMachinesTable', () => ({
  VirtualMachinesTable: ({ virtualMachines, onSelect, isLoading }: { virtualMachines: VirtualMachine[]; onSelect: (vm: VirtualMachine) => void; isLoading?: boolean }) => (
    <div data-testid="vm-table" data-loading={String(isLoading ?? false)}>
      {virtualMachines.map((item) => <button key={item.id} type="button" onClick={() => { onSelect(item) }}>Select {item.id}</button>)}
    </div>
  ),
}))
vi.mock('./VirtualMachineDetailPanel', () => ({
  VirtualMachineDetailPanel: ({ virtualMachine, open }: { virtualMachine: VirtualMachine | null; open: boolean }) => (
    open && virtualMachine ? <div role="dialog">{virtualMachine.name}</div> : null
  ),
}))

const props = {
  providers: [provider], providersPending: false, providersSuccess: true, providersFetching: false,
  providersError: null, onRefetchProviders: vi.fn(), providerId: provider.id, tabs: null,
  t: (key: string) => key, role: 'source' as const,
}

beforeEach(() => {
  inventory = { reportedCount: 1, virtualMachines: [vm] }
  inventoryBackgroundFetching = false
})
afterEach(() => { vi.clearAllMocks() })

describe('VmwareResourcesPage', () => {
  it('passes background fetching to the table without replacing the inventory shell', () => {
    inventoryBackgroundFetching = true

    render(<VmwareResourcesPage {...props} />)

    expect(screen.getByTestId('vm-table')).toHaveAttribute('data-loading', 'true')
    expect(screen.getByRole('searchbox', { name: 'Search virtual machines' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'pages.virtualMachines.inventory.title' })).toBeInTheDocument()
  })

  it('closes the detail drawer when the selected VM disappears from the provider dataset', () => {
    const view = render(<VmwareResourcesPage {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Select vm-01' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('VM 01')

    inventory = { reportedCount: 0, virtualMachines: [] }
    view.rerender(<VmwareResourcesPage {...props} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
