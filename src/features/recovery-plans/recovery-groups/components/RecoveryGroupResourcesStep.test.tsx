import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'

interface InventoryQueryDouble {
  data: { resourceNames: string[] } | undefined
  error: Error | null
  isLoading: boolean
  isSearching: boolean
  isFetching: boolean
  refetch: () => void
}

const useRecoveryGroupResourceInventory = vi.fn<
  (workloadType: string | null, providerId: string | null, options?: { vmwareNamePrefix?: string }) => InventoryQueryDouble
>()

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRecoveryGroupResourceInventory', () => ({
  useRecoveryGroupResourceInventory: (
    workloadType: string | null,
    providerId: string | null,
    options?: { vmwareNamePrefix?: string },
  ) => useRecoveryGroupResourceInventory(workloadType, providerId, options),
}))

describe('RecoveryGroupResourcesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: [] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it.each([
    ['vmware_virtual_machines', 'vmware-1', 'VM-01'],
    ['ibm_power_virtual_machines', 'power-1', 'LPAR-01'],
    ['ibm_flashsystem', 'flash-1', 'VOL-01'],
  ] as const)('shows %s resources from the selected provider', (
    workloadType,
    providerId,
    resourceName,
  ) => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: [resourceName] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType={workloadType}
        providerId={providerId}
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByText(resourceName)).toBeInTheDocument()
    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith(
      workloadType,
      providerId,
      { vmwareNamePrefix: '' },
    )
  })

  it('shows a retryable inventory error', () => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: undefined,
      error: new Error('Provider unavailable'),
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="ibm_flashsystem"
        providerId="flash-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByText('Recovery group resources could not be loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('passes VMware search text to the inventory hook without filtering its server result locally', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['DB-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={['SELECTED-VM']}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'WEB')

    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith(
      'vmware_virtual_machines',
      'vmware-1',
      { vmwareNamePrefix: 'WEB' },
    )
    expect(screen.getByText('DB-01')).toBeInTheDocument()
    expect(screen.getByText('SELECTED-VM')).toBeInTheDocument()
  })

  it('shows the loading list while a VMware search is in flight and keeps the search box usable', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['DB-01'] },
      error: null,
      isLoading: false,
      isSearching: true,
      isFetching: true,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    const searchbox = screen.getByRole('searchbox', { name: 'Search virtual machines' })
    expect(screen.getByRole('status', { name: 'Loading virtual machines' })).toBeInTheDocument()
    expect(screen.queryByText('DB-01')).not.toBeInTheDocument()
    expect(searchbox).toBeEnabled()

    await user.type(searchbox, 'WEB')

    expect(searchbox).toHaveValue('WEB')
  })

  it('clears VMware search text when its provider scope changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'WEB')
    rerender(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-2"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith(
      'vmware_virtual_machines',
      'vmware-2',
      { vmwareNamePrefix: '' },
    )
  })

  it('keeps IBM Power search local', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['LPAR-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="ibm_power_virtual_machines"
        providerId="power-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'WEB')

    expect(useRecoveryGroupResourceInventory).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('LPAR-01')).not.toBeInTheDocument()
  })

  it('keeps available and selected resources in independent scroll regions', () => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['VM-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    const { container } = render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={['VM-01']}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(container.firstElementChild?.children[0]).toHaveClass('h-72', 'min-h-0', 'overflow-hidden', 'lg:h-full')
    expect(container.firstElementChild?.children[1]).toHaveClass('flex', 'h-72', 'min-h-0', 'flex-col', 'lg:h-full')
    expect(screen.getByRole('list', { name: 'Available virtual machines' }).parentElement).toHaveClass(
      'custom-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    )
    expect(screen.getByLabelText('Selected recovery group virtual machines')).toHaveClass(
      'custom-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    )
  })
})
