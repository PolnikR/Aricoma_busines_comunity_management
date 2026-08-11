import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecoveryAppPolicies } from '../hooks/useRecoveryAppPolicies'
import { RecoveryAppPoliciesPage } from './RecoveryAppPoliciesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRecoveryAppPolicies', () => ({ useRecoveryAppPolicies: vi.fn() }))
vi.mock('../components/RecoveryAppPoliciesTable', () => ({
  RecoveryAppPoliciesTable: () => <div>Recovery app policy catalogue</div>,
}))
vi.mock('../components/RecoveryAppPolicyModal', () => ({
  RecoveryAppPolicyModal: ({ open, existingPolicies }: { open: boolean; existingPolicies: unknown[] }) => (
    open ? <div>Recovery app policy modal with {existingPolicies.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(useRecoveryAppPolicies).mockReturnValue({
    data: [{ id: 'critical-daily-latest' }], isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useRecoveryAppPolicies>)
})

describe('RecoveryAppPoliciesPage', () => {
  it('renders the shared inventory layout', () => {
    render(<MemoryRouter><RecoveryAppPoliciesPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Recovery Policies', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Recovery app policy catalogue')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Application Recovery' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens the create modal with cached policies', async () => {
    render(<MemoryRouter><RecoveryAppPoliciesPage /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Add Policy' }))
    expect(screen.getByText('Recovery app policy modal with 1 existing')).toBeInTheDocument()
  })
})
