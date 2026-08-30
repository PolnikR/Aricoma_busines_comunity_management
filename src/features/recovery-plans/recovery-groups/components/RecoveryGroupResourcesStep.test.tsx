import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'

interface InventoryQueryDouble {
  data: { resourceNames: string[] } | undefined
  error: Error | null
  isLoading: boolean
  isFetching: boolean
  refetch: () => void
}

const useRecoveryGroupResourceInventory = vi.fn<
  (workloadType: string | null, providerId: string | null) => InventoryQueryDouble
>()

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRecoveryGroupResourceInventory', () => ({
  useRecoveryGroupResourceInventory: (
    workloadType: string | null,
    providerId: string | null,
  ) => useRecoveryGroupResourceInventory(workloadType, providerId),
}))

describe('RecoveryGroupResourcesStep', () => {
  beforeEach(() => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: [] },
      error: null,
      isLoading: false,
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
    expect(useRecoveryGroupResourceInventory).toHaveBeenCalledWith(workloadType, providerId)
  })

  it('shows a retryable inventory error', () => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: undefined,
      error: new Error('Provider unavailable'),
      isLoading: false,
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

  it('keeps available and selected resources in independent scroll regions', () => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['VM-01'] },
      error: null,
      isLoading: false,
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
