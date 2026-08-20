import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourcesPage } from './ResourcesPage'
import type { DiscoveryInventory } from '../model/discoveryTypes'
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
let resourceTab: 'vmware' | 'flashsystem' | 'ibm-power' = 'vmware'
let selectedProviderId: string | null = null
let virtualMachineSearchParamsInitialized = true
const vmwareProvider: ProviderRecord = {
  id: 'vmware-01', name: 'VMware 01', description: '', type: 'VMWARE',
  ipAddress: '10.0.0.1', port: 22, credentialId: null, credentialStatus: 'none',
  vmPrefix: 'DEFAULT-', vmTags: ['default-tag'],
}
const flashProvider: ProviderRecord = {
  ...vmwareProvider,
  id: 'flash-01',
  name: 'Flash 01',
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
  isLoading: boolean
  isFetching: boolean
  refetch: typeof refetch
}
let virtualMachineQuery = {
  page: 1, pageSize: 10 as const, search: '', powerState: '', connectionState: '',
  cluster: '', tags: [] as string[], untagged: false,
}

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory', () => ({
  useVmwareResourceInventory: (...args: unknown[]) => {
    vmwareResourceInventorySpy(...args)
    return inventoryQuery
  },
}))
vi.mock('@/features/discovery-inventory/resources/hooks/useResourceInventoryQueries', () => ({
  useResourceInventoryQueries: (...args: unknown[]) => {
    resourceInventoryQuerySpy(...args)
    return resourceInventoryQuery
  },
}))
vi.mock('../hooks/useVmwareTags', () => ({
  useTags: (...args: unknown[]) => {
    vmwareTagsSpy(...args)
    return { data: [] }
  },
}))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => providersQuery,
}))
vi.mock('../hooks/useVirtualMachineSearchParams', () => ({
  useVirtualMachineSearchParams: (...args: unknown[]) => {
    virtualMachineSearchParamsSpy(...args)
    return { query: virtualMachineQuery, updateQuery, updateFilters, isInitialized: virtualMachineSearchParamsInitialized }
  },
}))
vi.mock('../hooks/useFlashSystemSearchParams', () => ({
  useFlashSystemSearchParams: () => ({
    query: { page: 1, pageSize: 25, search: '', poolId: '', hostId: '', status: '' },
    updateQuery: vi.fn(),
    updateFilters: vi.fn(),
  }),
}))
vi.mock('../hooks/useResourceTabSearchParam', () => ({
  useResourceTabSearchParam: () => ({ resourceTab, providerId: selectedProviderId, setResourceSource }),
}))
vi.mock('../components/vmware/VirtualMachineMetrics', () => ({
  VirtualMachineMetrics: () => <div>VM metrics</div>,
}))
vi.mock('../components/vmware/VirtualMachinesToolbar', () => ({
  VirtualMachinesToolbar: () => <div>VM toolbar</div>,
}))
vi.mock('../components/vmware/VirtualMachinesTable', () => ({
  VirtualMachinesTable: () => <div>VM table</div>,
}))
vi.mock('../components/vmware/VirtualMachineDetailPanel', () => ({
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
  resourceTab = 'vmware'
  selectedProviderId = null
  virtualMachineSearchParamsInitialized = true
  virtualMachineQuery = {
    page: 1, pageSize: 10, search: '', powerState: '', connectionState: '',
    cluster: '', tags: [], untagged: false,
  }
  providersQuery = {
    data: [vmwareProvider],
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
    isLoading: false,
    isFetching: false,
    refetch,
  }
})

describe('ResourcesPage', () => {
  it('waits for provider defaults before activating the intended inventory mode', () => {
    virtualMachineSearchParamsInitialized = false
    const view = render(<ResourcesPage />)

    expect(vmwareResourceInventorySpy).toHaveBeenLastCalledWith('vmware-01', '', undefined, false)

    virtualMachineQuery = {
      ...virtualMachineQuery,
      search: 'DEFAULT-',
      tags: ['default-tag'],
    }
    virtualMachineSearchParamsInitialized = true
    view.rerender(<ResourcesPage />)

    expect(vmwareResourceInventorySpy).toHaveBeenLastCalledWith('vmware-01', 'DEFAULT-', 'default-tag', true)
  })

  it('scopes provider defaults, URL filters, tags, and inventory to the selected source VMware provider', () => {
    const selectedVmwareProvider: ProviderRecord = {
      ...vmwareProvider,
      id: 'vmware-02',
      name: 'VMware 02',
      vmPrefix: 'SELECTED-',
      vmTags: ['selected-tag'],
    }
    selectedProviderId = selectedVmwareProvider.id
    providersQuery = { ...providersQuery, data: [vmwareProvider, selectedVmwareProvider] }
    virtualMachineQuery = {
      ...virtualMachineQuery,
      search: 'url-prefix',
      tags: ['url-tag'],
    }

    render(<ResourcesPage />)

    expect(virtualMachineSearchParamsSpy).toHaveBeenLastCalledWith({
      id: 'vmware-02',
      vmPrefix: 'SELECTED-',
      vmTags: ['selected-tag'],
    })
    expect(vmwareResourceInventorySpy).toHaveBeenLastCalledWith(
      'vmware-02',
      'url-prefix',
      'url-tag',
      true,
    )
    expect(vmwareTagsSpy).toHaveBeenLastCalledWith('vmware-02', true)
  })

  it('renders loading and initial error states', () => {
    inventoryQuery = { ...inventoryQuery, data: undefined, isLoading: true }
    const view = render(<ResourcesPage />)
    expect(screen.getByLabelText('Loading module')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'VMware VMs' })).toBeInTheDocument()
    inventoryQuery = {
      ...inventoryQuery,
      isLoading: false,
      error: new Error('inventory offline'),
    }
    view.rerender(<ResourcesPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown discovery error.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('inventory offline')
    expect(screen.getByText('VM toolbar')).toBeInTheDocument()
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
  })

  it('renders metrics, toolbar, and empty inventory state', () => {
    render(<ResourcesPage />)
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

  it('renders multiple provider sources in the single top resource tab list', () => {
    providersQuery = {
      ...providersQuery,
      data: Array.from({ length: 10 }, (_, index) => ({
        ...vmwareProvider,
        id: `vmware-${String(index + 1).padStart(2, '0')}`,
        name: `vCenter ${String(index + 1).padStart(2, '0')}`,
      })),
    }

    render(<ResourcesPage />)

    const sourceTabList = screen.getByRole('tablist', { name: 'Inventory source' })
    const vmwareTabs = within(sourceTabList)
      .getAllByRole('tab')
      .filter(tab => tab.textContent.startsWith('VMware VMs'))
    expect(vmwareTabs).toHaveLength(10)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)

    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · vCenter 10' }))
    expect(setResourceSource).toHaveBeenLastCalledWith({ resourceTab: 'vmware', providerId: 'vmware-10' })
  })

  it('waits for providers before activating a source inventory query', () => {
    resourceTab = 'flashsystem'
    providersQuery = {
      ...providersQuery,
      data: [],
      isLoading: true,
      isSuccess: false,
    }

    const view = render(<ResourcesPage />)

    expect(resourceInventoryQuerySpy).toHaveBeenCalledWith(null, [], undefined, 'source')
    const inventoryRegion = screen.getByRole('region', { name: 'Inventory records' })
    expect(within(inventoryRegion).getByRole('tab', { name: 'FlashSystem Volumes' })).toHaveAttribute('aria-selected', 'true')
    expect(inventoryRegion).toContainElement(screen.getByLabelText('Loading providers'))

    providersQuery = {
      ...providersQuery,
      data: [flashProvider],
      isLoading: false,
      isSuccess: true,
    }
    view.rerender(<ResourcesPage />)
    expect(resourceInventoryQuerySpy).toHaveBeenLastCalledWith(
      'flashsystem',
      [flashProvider],
      'flash-01',
      'source',
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

    render(<ResourcesPage />)

    expect(resourceInventoryQuerySpy).toHaveBeenCalledWith(null, [], undefined, 'source')
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

    render(<ResourcesPage />)

    expect(screen.getByText('No provider configured')).toBeInTheDocument()
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('does not expose source-provider error details', () => {
    resourceTab = 'flashsystem'
    providersQuery = {
      ...providersQuery,
      data: [flashProvider],
    }
    resourceInventoryQuery = {
      ...resourceInventoryQuery,
      hasProviders: true,
      failures: [{ provider: flashProvider, error: new Error('Zod payload internals') }],
    }

    render(<ResourcesPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Resource inventory could not be loaded')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Zod payload internals')
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
  })
})
