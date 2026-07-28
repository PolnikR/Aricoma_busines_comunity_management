import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachinesPage } from './VirtualMachinesPage'
import type { DiscoveryInventory } from '../../model/discoveryTypes'

const refetch = vi.fn()
const updateQuery = vi.fn()
const updateFilters = vi.fn()
let inventoryQuery: {
  data: DiscoveryInventory | undefined
  error: Error | null
  isLoading: boolean
  isFetching: boolean
  refetch: typeof refetch
}

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/api/useDiscoveryInventory', () => ({
  useDiscoveryInventory: () => inventoryQuery,
}))
vi.mock('../../api/useTags', () => ({ useTags: () => ({ data: [] }) }))
vi.mock('@/features/providers-connectors/providers/api/useProviders', () => ({
  useProviders: () => ({ data: [], isLoading: false }),
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
  VirtualMachinesSkeleton: () => <div role="status">VM skeleton</div>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  inventoryQuery = {
    data: { reportedCount: 0, virtualMachines: [] },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch,
  }
})

describe('VirtualMachinesPage', () => {
  it('renders loading and initial error states', () => {
    inventoryQuery = { ...inventoryQuery, data: undefined, isLoading: true }
    const view = render(<VirtualMachinesPage />)
    expect(screen.getByRole('status')).toHaveTextContent('VM skeleton')
    inventoryQuery = {
      ...inventoryQuery,
      isLoading: false,
      error: new Error('inventory offline'),
    }
    view.rerender(<VirtualMachinesPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('inventory offline')
  })

  it('renders metrics, toolbar, and empty inventory state', () => {
    render(<VirtualMachinesPage />)
    expect(screen.getByText('VM metrics')).toBeInTheDocument()
    expect(screen.getByText('VM toolbar')).toBeInTheDocument()
    expect(screen.getByText('No virtual machines found')).toBeInTheDocument()
  })
})
