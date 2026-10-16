import { act, cleanup, render as renderUi, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VmwareResourcesPage } from './VmwareResourcesPage'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { VirtualMachine } from '../../types/virtualMachineTypes'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const provider: ProviderRecord = {
  id: 'vmware-01', name: 'VMware 01', description: '', type: 'VMWARE', role: 'source', ipAddress: '10.0.0.1',
 credentialId: null, credentialStatus: 'none',
}
const vm: VirtualMachine = {
  id: 'vm-01', name: 'VM 01', powerState: 'poweredOn', connectionState: 'connected', guestOs: 'Linux',
  hostname: 'vm-01', ipAddress: '10.0.0.10', vcpu: 2, memoryGb: 4, host: 'esx-01', cluster: 'cluster-01',
  datastore: 'store-01', folder: '/', vmPath: '/vm/vm-01', providerId: provider.id, providerType: 'VMWARE',
  diskCount: 1, diskCapacityGb: 20, vdisks: [], snapshotCount: 0, toolsStatus: 'ok', tags: [],
}

let inventory: { reportedCount: number; virtualMachines: VirtualMachine[] }
let inventoryBackgroundFetching = false
let inventoryError = false
let inventoryReadiness = { isSuccess: true, isPlaceholderData: false, isDebouncing: false }
let forceRefreshError: Error | null = null
let forceRefreshPending = false
const refetchInventory = vi.fn()
const forceRefreshInventory = vi.fn().mockResolvedValue(undefined)
let client: QueryClient

function render(ui: ReactNode) {
  return renderUi(ui, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
}

vi.mock('../../hooks/useVirtualMachineSearchParams', () => ({
  useVirtualMachineSearchParams: () => ({
    query: { page: 1, pageSize: 10, search: '', powerState: '', connectionState: '', cluster: '', tags: [], untagged: false },
    updateQuery: vi.fn(), updateFilters: vi.fn(), isInitialized: true,
  }),
}))
vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => ({ data: [provider], error: null, isLoading: false, isSuccess: true, isFetching: false, refetch: vi.fn() }),
}))
vi.mock('../../hooks/useVmwareResourceInventory', () => ({
  useVmwareResourceInventory: () => ({
    ...inventoryReadiness,
    data: inventory, isInitialLoading: false, isFetching: inventoryBackgroundFetching, isBackgroundFetching: inventoryBackgroundFetching,
    isError: inventoryError, isEmpty: inventory.virtualMachines.length === 0, refetch: refetchInventory,
    forceRefresh: forceRefreshInventory, isForceRefreshing: forceRefreshPending, forceRefreshError,
  }),
}))
vi.mock('@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory', () => ({
  useVmwareResourceInventory: () => ({
    ...inventoryReadiness,
    data: inventory, isInitialLoading: false, isFetching: inventoryBackgroundFetching, isBackgroundFetching: inventoryBackgroundFetching,
    isError: inventoryError, isEmpty: inventory.virtualMachines.length === 0, refetch: refetchInventory,
    forceRefresh: forceRefreshInventory, isForceRefreshing: forceRefreshPending, forceRefreshError,
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
  client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  inventoryReadiness = { isSuccess: true, isPlaceholderData: false, isDebouncing: false }
  inventory = { reportedCount: 1, virtualMachines: [vm] }
  inventoryBackgroundFetching = false
  inventoryError = false
  forceRefreshError = null
  forceRefreshPending = false
})
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks(); vi.unstubAllGlobals() })

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

  it('uses the live force refresh command from the page header', () => {
    forceRefreshPending = true

    render(<VmwareResourcesPage {...props} />)

    expect(screen.getByText('Updating')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(forceRefreshInventory).toHaveBeenCalledOnce()
    expect(refetchInventory).not.toHaveBeenCalled()
  })

  it('keeps inventory query-error retry on ordinary refetch', () => {
    inventoryError = true

    render(<VmwareResourcesPage {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(refetchInventory).toHaveBeenCalledOnce()
    expect(forceRefreshInventory).not.toHaveBeenCalled()
  })

  it('keeps cached inventory visible when live refresh fails', () => {
    forceRefreshError = new Error('Live refresh failed')

    render(<VmwareResourcesPage {...props} />)

    expect(screen.getByTestId('vm-table')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('pages.virtualMachines.error.latestFailed')
  })

  it.each(['pending', 'error', 'placeholder', 'debouncing', 'fetching', 'force refresh', 'providers pending', 'disabled'])(
    'defers background prefetch while active inventory is %s', async state => {
      const candidate = { ...provider, id: 'vmware-02' }
      const idle = vi.fn<() => number>().mockReturnValue(1)
      let scheduled: () => void = vi.fn()
      vi.stubGlobal('requestIdleCallback', (callback: () => void) => { scheduled = callback; return idle() })
      vi.stubGlobal('cancelIdleCallback', vi.fn())
      const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ count: 0, vms: [] }))))
      vi.stubGlobal('fetch', fetchMock)
      if (state === 'pending') inventoryReadiness.isSuccess = false
      if (state === 'error') { inventoryReadiness.isSuccess = false; inventoryError = true }
      if (state === 'placeholder') inventoryReadiness.isPlaceholderData = true
      if (state === 'debouncing') inventoryReadiness.isDebouncing = true
      if (state === 'fetching') inventoryBackgroundFetching = true
      if (state === 'force refresh') forceRefreshPending = true
      const view = render(<VmwareResourcesPage {...props} backgroundPrefetchProvider={candidate}
        providersPending={state === 'providers pending'} providersSuccess={state !== 'disabled'} />)
      expect(idle).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
      inventoryReadiness = { isSuccess: true, isPlaceholderData: false, isDebouncing: false }
      inventoryError = false
      inventoryBackgroundFetching = false
      forceRefreshPending = false
      view.rerender(<VmwareResourcesPage {...props} backgroundPrefetchProvider={candidate} />)
      expect(idle).toHaveBeenCalledOnce()
      await act(async () => { scheduled(); await Promise.resolve() })
      await waitFor(() => { expect(fetchMock).toHaveBeenCalledOnce() })
      expect(fetchMock).toHaveBeenCalledWith('/api/vms/search?provider_id=vmware-02', expect.objectContaining({ method: 'POST', body: '{}' }))
    },
  )
})
