import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetRecoveryAppPolicies } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import { RecoveryAppPoliciesPage } from './RecoveryAppPoliciesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/recovery-app-policies/recovery-app-policies.gen', () => ({ useGetRecoveryAppPolicies: vi.fn() }))
vi.mock('../components/RecoveryAppPoliciesTable', () => ({
  RecoveryAppPoliciesTable: () => <div>Recovery app policy catalogue</div>,
}))
vi.mock('../components/RecoveryAppPolicyModal', () => ({
  RecoveryAppPolicyModal: ({ open, existingPolicies }: { open: boolean; existingPolicies: unknown[] }) => (
    open ? <div>Recovery app policy modal with {existingPolicies.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(useGetRecoveryAppPolicies).mockReturnValue({
    data: [{ id: 'critical-daily-latest' }], isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
})

describe('RecoveryAppPoliciesPage', () => {
  it('renders the shared inventory layout', () => {
    render(<MemoryRouter><RecoveryAppPoliciesPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Recovery policies', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Recovery app policy catalogue')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Application Recovery Policies' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Clean Room Policies' })).toBeInTheDocument()
  })

  it('opens the create modal with cached policies', async () => {
    render(<MemoryRouter><RecoveryAppPoliciesPage /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Add policy' }))
    expect(screen.getByText('Recovery app policy modal with 1 existing')).toBeInTheDocument()
  })
})
