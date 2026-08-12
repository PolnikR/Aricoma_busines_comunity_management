import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCleanRoomPolicies } from '../hooks/useCleanRoomPolicies'
import { CleanRoomPoliciesPage } from './CleanRoomPoliciesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useCleanRoomPolicies', () => ({ useCleanRoomPolicies: vi.fn() }))
vi.mock('../components/CleanRoomPoliciesTable', () => ({ CleanRoomPoliciesTable: () => <div>Clean room policy catalogue</div> }))
vi.mock('../components/CleanRoomPolicyModal', () => ({
  CleanRoomPolicyModal: ({ open }: { open: boolean }) => open ? <div>Clean room policy modal</div> : null,
}))

beforeEach(() => {
  vi.mocked(useCleanRoomPolicies).mockReturnValue({
    data: [], isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCleanRoomPolicies>)
})

describe('CleanRoomPoliciesPage', () => {
  it('renders as the third Recovery Policies tab', () => {
    render(<MemoryRouter><CleanRoomPoliciesPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Clean Room Policies' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Clean room policy catalogue')).toBeInTheDocument()
  })

  it('opens create and refreshes from the shared toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(useCleanRoomPolicies).mockReturnValue({
      data: [], isLoading: false, isFetching: false, error: null, refetch,
    } as unknown as ReturnType<typeof useCleanRoomPolicies>)
    render(<MemoryRouter><CleanRoomPoliciesPage /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Add Clean Room Policy' }))
    expect(screen.getByText('Clean room policy modal')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
