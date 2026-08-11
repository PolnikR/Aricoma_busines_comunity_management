import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSnapshotPolicies } from '../hooks/useSnapshotPolicies'
import { SnapshotPoliciesPage } from './SnapshotPoliciesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useSnapshotPolicies', () => ({ useSnapshotPolicies: vi.fn() }))
vi.mock('../components/SnapshotPoliciesTable', () => ({
  SnapshotPoliciesTable: () => <div>Snapshot policy catalogue</div>,
}))
vi.mock('../components/SnapshotPolicyModal', () => ({
  SnapshotPolicyModal: ({ open, existingPolicies }: { open: boolean; existingPolicies: unknown[] }) => (
    open ? <div>Policy modal with {existingPolicies.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(useSnapshotPolicies).mockReturnValue({
    data: [{ id: 'critical-15m' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useSnapshotPolicies>)
})

describe('SnapshotPoliciesPage', () => {
  it('renders the shared inventory layout without category tabs', () => {
    render(<MemoryRouter><SnapshotPoliciesPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Recovery Policies', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Snapshot policy catalogue')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Snapshot' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Application Recovery' })).toBeInTheDocument()
  })

  it('opens the create modal with cached policies', async () => {
    render(<MemoryRouter><SnapshotPoliciesPage /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Add Policy' }))
    expect(screen.getByText('Policy modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes snapshot policies from the page toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(useSnapshotPolicies).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof useSnapshotPolicies>)
    render(<MemoryRouter><SnapshotPoliciesPage /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
