import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourcesPage } from './ResourcesPage'
import type { DiscoveryInventory } from '../../model/discoveryTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

const refetch = vi.fn()
const updateQuery = vi.fn()
const updateFilters = vi.fn()
const refetchProviders = vi.fn()
const resourceInventoryQuerySpy = vi.fn()
const refetchResourceInventory = vi.fn()
let resourceTab: 'vmware' | 'flashsystem' | 'ibm-power' = 'vmware'
const vmwareProvider: ProviderRecord = {
  id: 'vmware-01', name: 'VMware 01', description: '', type: 'VMWARE',
  ipAddress: '10.0.0.1', credentialId: null, credentialStatus: 'none',
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

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/hooks/useDiscoveryInventory', () => ({
  useDiscoveryInventory: () => inventoryQuery,
}))
vi.mock('@/features/discovery-inventory/hooks/useResourceInventoryQueries', () => ({
  useResourceInventoryQueries: (...args: unknown[]) => {
    resourceInventoryQuerySpy(...args)
    return resourceInventoryQuery
  },
}))
vi.mock('../../hooks/useTags', () => ({ useTags: () => ({ data: [] }) }))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => providersQuery,
}))
vi.mock('../hooks/useVirtualMachineSearchParams', () => ({
  useVirtualMachineSearchParams: () => ({
    query: {
      page: 1, pageSize: 10, search: '', powerState: '', connectionState: '',
      cluster: '', providerId: null, tags: [], untagged: false,
    },
    updateQuery,
    updateFilters,
  }),
}))
vi.mock('../hooks/useResourceTabSearchParam', () => ({
  useResourceTabSearchParam: () => ({ resourceTab, setResourceTab: vi.fn() }),
}))
vi.mock('../components/VirtualMachineMetrics', () => ({
  VirtualMachineMetrics: () => <div>VM metrics</div>,
}))
vi.mock('../components/VirtualMachinesToolbar', () => ({
  VirtualMachinesToolbar: () => <div>VM toolbar</div>,
}))
vi.mock('../components/VirtualMachinesTable', () => ({
  VirtualMachinesTable: () => <div>VM table</div>,
}))
vi.mock('../components/VirtualMachineDetailPanel', () => ({
  VirtualMachineDetailPanel: () => <div>VM detail</div>,
}))
vi.mock('../skeletons', () => ({
  MetricsSkeleton: () => <div>Metrics skeleton</div>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  resourceTab = 'vmware'
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
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
  })

  it('renders metrics, toolbar, and empty inventory state', () => {
    render(<ResourcesPage />)
    expect(screen.getByText('VM metrics')).toBeInTheDocument()
    expect(screen.getByText('VM toolbar')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'VMware VMs' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'FlashSystem Volumes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'IBM Power Partitions' })).toBeInTheDocument()
    expect(screen.getByText('No virtual machines found')).toBeInTheDocument()
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

    expect(resourceInventoryQuerySpy).toHaveBeenCalledWith(null, [])
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
    expect(resourceInventoryQuerySpy).toHaveBeenLastCalledWith('flashsystem', [flashProvider])
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

    expect(resourceInventoryQuerySpy).toHaveBeenCalledWith(null, [])
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
    expect(screen.queryByText('Metrics skeleton')).not.toBeInTheDocument()
  })
})
