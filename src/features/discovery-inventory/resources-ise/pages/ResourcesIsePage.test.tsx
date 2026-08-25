import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourcesIsePage } from './ResourcesIsePage'
import type { DiscoveryInventory } from '@/features/discovery-inventory/resources/model/discoveryTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

const refetch = vi.fn()
const updateQuery = vi.fn()
const updateFilters = vi.fn()
const refetchProviders = vi.fn()
const setResourceSource = vi.fn()
const resourceInventoryQuerySpy = vi.fn()
const refetchResourceInventory = vi.fn()
const vmwareResourceInventorySpy = vi.fn()
const virtualMachineSearchParamsSpy = vi.fn()
const vmwareTagsSpy = vi.fn()
let useRealVmwareResourceInventory = false
let useRealVirtualMachineSearchParams = false
let useRealVmwareTags = false
let useRealVmwareToolbar = false
let useRealVmwareTable = false
let resourceTab: 'vmware' | 'flashsystem' | 'ibm-power' = 'vmware'
let selectedProviderId: string | null = null
const vmwareTargetProvider: ProviderRecord = {
  id: 'vmware-target-01', name: 'VMware Target 01', description: '', type: 'VMWARE',
  ipAddress: '10.0.0.1', port: 22, credentialId: null, credentialStatus: 'none', role: 'target',
  vmPrefix: 'TARGET-', vmTags: ['target-tag'],
}
const flashTargetProvider: ProviderRecord = {
  ...vmwareTargetProvider,
  id: 'flash-target-01',
  name: 'Flash Target 01',
  type: 'FLASHCOPY',
}
let providersQuery: {
  data: ProviderRecord[]
  error: Error | null
  isLoading: boolean
  isSuccess: boolean
  isFetching: boolean
  refetch: typeof refetchProviders
}
let resourceInventoryQuery: {
  flashSystemResources: never[]
  powerResources: never[]
  flashSystemInventories: never[]
  powerInventories: never[]
  failures: { provider: ProviderRecord; error: Error }[]
  isLoading: boolean
  isFetching: boolean
  hasProviders: boolean
  refetch: typeof refetchResourceInventory
}
let inventoryQuery: {
  data: DiscoveryInventory | undefined
  error: Error | null
  isInitialLoading: boolean
  isDebouncing: boolean
  isBackgroundFetching: boolean
  isError: boolean
  isEmpty: boolean
  isFetching: boolean
  refetch: typeof refetch
}
let virtualMachineQuery = {
  page: 1, pageSize: 10 as const, search: '', powerState: '', connectionState: '',
  cluster: '', tags: [] as string[], untagged: false,
}

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory')>()

  return {
    ...actual,
    useVmwareResourceInventory: (...args: Parameters<typeof actual.useVmwareResourceInventory>) => {
      vmwareResourceInventorySpy(...args)
      return useRealVmwareResourceInventory
        ? actual.useVmwareResourceInventory(...args)
        : inventoryQuery
    },
  }
})
vi.mock('@/features/discovery-inventory/resources/hooks/useResourceInventoryQueries', () => ({
  useResourceInventoryQueries: (...args: unknown[]) => {
    resourceInventoryQuerySpy(...args)
    return resourceInventoryQuery
  },
}))
vi.mock('@/features/discovery-inventory/resources/hooks/useVmwareTags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/discovery-inventory/resources/hooks/useVmwareTags')>()

  return {
    ...actual,
    useTags: (...args: Parameters<typeof actual.useTags>) => {
      vmwareTagsSpy(...args)
      return useRealVmwareTags ? actual.useTags(...args) : { data: [] }
    },
  }
})
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => providersQuery,
}))
vi.mock('@/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams')>()

  return {
    ...actual,
    useVirtualMachineSearchParams: (...args: Parameters<typeof actual.useVirtualMachineSearchParams>) => {
      virtualMachineSearchParamsSpy(...args)
      return useRealVirtualMachineSearchParams
        ? actual.useVirtualMachineSearchParams(...args)
        : { query: virtualMachineQuery, updateQuery, updateFilters, isInitialized: true }
    },
  }
})
vi.mock('@/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams', () => ({
  useFlashSystemSearchParams: () => ({
    query: { page: 1, pageSize: 25, search: '', poolId: '', hostId: '', status: '' },
    updateQuery: vi.fn(),
    updateFilters: vi.fn(),
  }),
}))
vi.mock('@/features/discovery-inventory/resources/hooks/useResourceTabSearchParam', () => ({
  useResourceTabSearchParam: () => ({ resourceTab, providerId: selectedProviderId, setResourceSource }),
}))
vi.mock('@/features/discovery-inventory/resources/components/vmware/VirtualMachineMetrics', () => ({
  VirtualMachineMetrics: () => <div>VM metrics</div>,
}))
vi.mock('@/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar')>()

  return {
    ...actual,
    VirtualMachinesToolbar: (props: Parameters<typeof actual.VirtualMachinesToolbar>[0]) => useRealVmwareToolbar
      ? <actual.VirtualMachinesToolbar {...props} />
      : <div>VM toolbar</div>,
  }
})
vi.mock('@/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable')>()

  return {
    ...actual,
    VirtualMachinesTable: (props: Parameters<typeof actual.VirtualMachinesTable>[0]) => useRealVmwareTable
      ? <actual.VirtualMachinesTable {...props} />
      : <div>VM table</div>,
  }
})
vi.mock('@/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel', () => ({
  VirtualMachineDetailPanel: () => <div>VM detail</div>,
}))
vi.mock('@/shared/components/stat-card/StatCard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/components/stat-card/StatCard')>()

  return {
    ...actual,
    MetricsSkeleton: () => <div>Metrics skeleton</div>,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  useRealVmwareResourceInventory = false
  useRealVirtualMachineSearchParams = false
  useRealVmwareTags = false
  useRealVmwareToolbar = false
  useRealVmwareTable = false
  resourceTab = 'vmware'
  selectedProviderId = null
  virtualMachineQuery = {
    page: 1, pageSize: 10, search: '', powerState: '', connectionState: '',
    cluster: '', tags: [], untagged: false,
  }
  providersQuery = {
    data: [vmwareTargetProvider],
    error: null,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    refetch: refetchProviders,
  }
  resourceInventoryQuery = {
    flashSystemResources: [],
    powerResources: [],
    flashSystemInventories: [],
    powerInventories: [],
    failures: [],
    isLoading: false,
    isFetching: false,
    hasProviders: false,
    refetch: refetchResourceInventory,
  }
  inventoryQuery = {
    data: { reportedCount: 0, virtualMachines: [] },
    error: null,
    isInitialLoading: false,
    isDebouncing: false,
    isBackgroundFetching: false,
    isError: false,
    isEmpty: true,
    isFetching: false,
    refetch,
  }
})

describe('ResourcesIsePage', () => {
  it('keeps a configured tag missing from the target tags endpoint selected for canonical tag inventory', async () => {
    useRealVmwareResourceInventory = true
    useRealVirtualMachineSearchParams = true
    useRealVmwareTags = true
    useRealVmwareToolbar = true
    useRealVmwareTable = true
    providersQuery = {
      ...providersQuery,
      data: [{ ...vmwareTargetProvider, vmPrefix: 'DR-', vmTags: ['recovery'] }],
    }
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/tags?provider_id=vmware-target-01') {
        return Promise.resolve(new Response(JSON.stringify({
          count: 1,
          tags: [{ id: 'server-tag', name: 'server-tag' }],
        }), { status: 200 }))
      }
      if (url === '/api/vms_by_tag?tag=recovery&provider_id=vmware-target-01') {
        return Promise.resolve(new Response(JSON.stringify({
          count: 2,
          vms: [
            { name: 'DR-recovery-01', tags: ['recovery'] },
            { name: 'OTHER-01', tags: ['recovery'] },
          ],
        }), { status: 200 }))
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <MemoryRouter initialEntries={['/resources-ise']}>
        <QueryClientProvider client={queryClient}><ResourcesIsePage /></QueryClientProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/vms_by_tag?tag=recovery&provider_id=vmware-target-01',
        expect.any(Object),
      )
    })
    await waitFor(() => { expect(screen.getByText('DR-recovery-01')).toBeInTheDocument() })

    expect(screen.queryByText('OTHER-01')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    expect(screen.getByLabelText('Tag')).toHaveValue('recovery')
    expect(screen.getByRole('option', { name: 'recovery' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'server-tag' })).toBeInTheDocument()
  })

  it.each(['failure', 'empty'] as const)('keeps configured recovery selected when the target /tags response is %s', async (tagsResponse) => {
    useRealVmwareResourceInventory = true
    useRealVirtualMachineSearchParams = true
    useRealVmwareTags = true
    useRealVmwareToolbar = true
    useRealVmwareTable = true
    providersQuery = {
      ...providersQuery,
      data: [{ ...vmwareTargetProvider, vmPrefix: 'DR-', vmTags: ['recovery'] }],
    }
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/tags?provider_id=vmware-target-01') {
        return tagsResponse === 'failure'
          ? Promise.resolve(new Response('tags unavailable', { status: 500 }))
          : Promise.resolve(new Response(JSON.stringify({ count: 0, tags: [] }), { status: 200 }))
      }
      if (url === '/api/vms_by_tag?tag=recovery&provider_id=vmware-target-01') {
        return Promise.resolve(new Response(JSON.stringify({
          count: 1,
          vms: [{ name: 'DR-recovery-01', tags: ['recovery'] }],
        }), { status: 200 }))
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <MemoryRouter initialEntries={['/resources-ise']}>
        <QueryClientProvider client={queryClient}><ResourcesIsePage /></QueryClientProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/vms_by_tag?tag=recovery&provider_id=vmware-target-01',
        expect.any(Object),
      )
      expect(screen.getByText('DR-recovery-01')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    expect(screen.getByLabelText('Tag')).toHaveValue('recovery')
    expect(screen.getByRole('option', { name: 'recovery' })).toBeInTheDocument()
  })

  it('scopes provider defaults, URL filters, tags, and inventory to the selected target VMware provider', () => {
    const selectedVmwareProvider: ProviderRecord = {
      ...vmwareTargetProvider,
      id: 'vmware-target-02',
      name: 'VMware Target 02',
      vmPrefix: 'TARGET-SELECTED-',
      vmTags: ['target-selected-tag'],
    }
    selectedProviderId = selectedVmwareProvider.id
    providersQuery = { ...providersQuery, data: [vmwareTargetProvider, selectedVmwareProvider] }
    virtualMachineQuery = {
      ...virtualMachineQuery,
      search: 'ise-url-prefix',
      tags: ['ise-url-tag'],
    }

    render(<ResourcesIsePage />)

    expect(virtualMachineSearchParamsSpy).toHaveBeenLastCalledWith({
      id: 'vmware-target-02',
      role: 'target',
      vmPrefix: 'TARGET-SELECTED-',
      vmTags: ['target-selected-tag'],
    })
    expect(vmwareResourceInventorySpy).toHaveBeenLastCalledWith(
      'vmware-target-02',
      'ise-url-prefix',
      'ise-url-tag',
      true,
    )
    expect(vmwareTagsSpy).toHaveBeenLastCalledWith('vmware-target-02', true)
  })

  it('renders loading and initial error states with target providers', () => {
    inventoryQuery = { ...inventoryQuery, data: undefined, isInitialLoading: true, isEmpty: false }
    const view = render(<ResourcesIsePage />)
    expect(screen.getByLabelText('Loading module')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'VMware VMs' })).toBeInTheDocument()
    inventoryQuery = {
      ...inventoryQuery,
      isInitialLoading: false,
      error: new Error('inventory offline'),
      isError: true,
    }
    view.rerender(<ResourcesIsePage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown discovery error.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('inventory offline')
    expect(screen.getByText('VM toolbar')).toBeInTheDocument()
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
  })

  it('renders metrics, toolbar, and empty inventory state with target providers', () => {
    render(<ResourcesIsePage />)
    expect(screen.getByText('VM metrics')).toBeInTheDocument()
    expect(screen.getByText('VM toolbar')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'VMware VMs' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'VMware VMs' })).toHaveClass(
      'after:bottom-1.5',
      'after:inset-x-4',
      'after:h-0.5',
    )
    expect(screen.queryByRole('tab', { name: 'FlashSystem Volumes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'IBM Power Partitions' })).not.toBeInTheDocument()
    expect(screen.getByText('No virtual machines found')).toBeInTheDocument()
  })

  it('renders multiple target provider sources in the single top resource tab list', () => {
    providersQuery = {
      ...providersQuery,
      data: Array.from({ length: 10 }, (_, index) => ({
        ...vmwareTargetProvider,
        id: `vmware-target-${String(index + 1).padStart(2, '0')}`,
        name: `vCenter Target ${String(index + 1).padStart(2, '0')}`,
      })),
    }

    render(<ResourcesIsePage />)

    const sourceTabList = screen.getByRole('tablist', { name: 'Inventory source' })
    const vmwareTabs = within(sourceTabList)
      .getAllByRole('tab')
      .filter(tab => tab.textContent.startsWith('VMware VMs'))
    expect(vmwareTabs).toHaveLength(10)
    expect(vmwareTabs[9]).toHaveTextContent('vm-10')
    expect(screen.getAllByRole('tablist')).toHaveLength(1)

    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · vCenter Target 10' }))
    expect(setResourceSource).toHaveBeenLastCalledWith({ resourceTab: 'vmware', providerId: 'vmware-target-10' })
  })

  it('excludes source-role providers from target tabs', () => {
    const vmwareSourceProvider: ProviderRecord = {
      ...vmwareTargetProvider,
      id: 'vmware-source-01',
      name: 'VMware Source 01',
      role: 'source',
    }
    providersQuery = {
      ...providersQuery,
      data: [vmwareSourceProvider, flashTargetProvider],
    }

    render(<ResourcesIsePage />)

    expect(screen.queryByRole('tab', { name: /VMware VMs/ })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'FlashSystem Volumes' })).toBeInTheDocument()
  })

  it('waits for providers before activating a target inventory query', () => {
    resourceTab = 'flashsystem'
    providersQuery = {
      ...providersQuery,
      data: [],
      isLoading: true,
      isSuccess: false,
    }

    const view = render(<ResourcesIsePage />)

    expect(resourceInventoryQuerySpy).toHaveBeenCalledWith(null, [], undefined, 'target')
    const inventoryRegion = screen.getByRole('region', { name: 'Inventory records' })
    expect(within(inventoryRegion).getByRole('tab', { name: 'FlashSystem Volumes' })).toHaveAttribute('aria-selected', 'true')
    expect(inventoryRegion).toContainElement(screen.getByLabelText('Loading providers'))

    providersQuery = {
      ...providersQuery,
      data: [flashTargetProvider],
      isLoading: false,
      isSuccess: true,
    }
    view.rerender(<ResourcesIsePage />)
    expect(resourceInventoryQuerySpy).toHaveBeenLastCalledWith(
      'flashsystem',
      [flashTargetProvider],
      'flash-target-01',
      'target',
    )
  })

  it('shows provider errors without activating inventory queries', () => {
    resourceTab = 'ibm-power'
    providersQuery = {
      ...providersQuery,
      data: [],
      error: new Error('provider service offline'),
      isSuccess: false,
    }

    render(<ResourcesIsePage />)

    expect(resourceInventoryQuerySpy).toHaveBeenCalledWith(null, [], undefined, 'target')
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load providers.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('provider service offline')
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('No provider configured')).not.toBeInTheDocument()
  })

  it('renders a terminal no-provider state without a loading skeleton', () => {
    providersQuery = {
      ...providersQuery,
      data: [],
      isSuccess: true,
    }

    render(<ResourcesIsePage />)

    expect(screen.getByText('No provider configured')).toBeInTheDocument()
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('does not expose target-provider error details', () => {
    resourceTab = 'flashsystem'
    providersQuery = {
      ...providersQuery,
      data: [flashTargetProvider],
    }
    resourceInventoryQuery = {
      ...resourceInventoryQuery,
      hasProviders: true,
      failures: [{ provider: flashTargetProvider, error: new Error('Zod payload internals') }],
    }

    render(<ResourcesIsePage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Resource inventory could not be loaded')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Zod payload internals')
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
  })
})
