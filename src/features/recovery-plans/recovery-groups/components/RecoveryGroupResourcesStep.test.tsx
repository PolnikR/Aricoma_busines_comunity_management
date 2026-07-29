import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'

const useDiscoveryInventory = vi.fn(() => ({
  data: undefined,
  error: null,
  isLoading: false,
  isFetching: false,
  refetch: vi.fn(),
}))

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/api/useDiscoveryInventory', () => ({
  useDiscoveryInventory: () => useDiscoveryInventory(),
}))

describe('RecoveryGroupResourcesStep', () => {
  it('does not request VM inventory for an IBM FlashSystem group', () => {
    render(
      <RecoveryGroupResourcesStep
        workloadType="ibm_flashsystem"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(useDiscoveryInventory).not.toHaveBeenCalled()
    expect(screen.getByText('FlashSystem resources are not available yet')).toBeInTheDocument()
  })
})
