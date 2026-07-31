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
})
