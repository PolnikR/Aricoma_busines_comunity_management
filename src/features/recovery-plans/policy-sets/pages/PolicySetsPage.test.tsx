import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePolicySets } from '../hooks/usePolicySets'
import { PolicySetsPage } from './PolicySetsPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/usePolicySets', () => ({ usePolicySets: vi.fn() }))
vi.mock('../components/PolicySetsTable', () => ({
  PolicySetsTable: () => <div>Policy set catalogue</div>,
}))
vi.mock('../components/PolicySetModal', () => ({
  PolicySetModal: ({ open, existingPolicySets }: { open: boolean; existingPolicySets: unknown[] }) => (
    open ? <div>Policy set modal with {existingPolicySets.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(usePolicySets).mockReturnValue({
    data: [{ id: 'tier2-apps' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePolicySets>)
})

describe('PolicySetsPage', () => {
  it('renders the shared inventory layout without category tabs', () => {
    render(<PolicySetsPage />)

    expect(screen.getByRole('heading', { name: 'Policy Sets', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Policy set catalogue')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('constrains the inventory shell inside the available page space', () => {
    render(<PolicySetsPage />)

    const inventorySection = screen.getByRole('region', { name: 'Policy set records' })
    const inventoryHost = inventorySection.parentElement?.parentElement

    expect(inventoryHost).toHaveClass('flex', 'min-h-0', 'min-w-0', 'flex-1', 'flex-col', 'overflow-hidden')
  })

  it('opens the create modal with cached policy sets', async () => {
    render(<PolicySetsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add Policy Set' }))
    expect(screen.getByText('Policy set modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes policy sets from the page toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(usePolicySets).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof usePolicySets>)
    render(<PolicySetsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
