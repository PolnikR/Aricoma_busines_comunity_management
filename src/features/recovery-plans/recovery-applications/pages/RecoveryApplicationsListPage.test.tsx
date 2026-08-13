import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationsListPage } from './RecoveryApplicationsListPage'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const refetch = vi.fn()
let query: {
  data: RecoveryApplicationListItem[] | undefined
  isLoading: boolean
  error: Error | null
  isFetching: boolean
  refetch: typeof refetch
}

vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRecoveryApplications', () => ({
  useRecoveryApplications: () => query,
}))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => ({
    data: [],
    isLoading: false,
    error: null,
    isFetching: false,
  }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  query = {
    data: [],
    isLoading: false,
    error: null,
    isFetching: false,
    refetch,
  }
})

describe('RecoveryApplicationsListPage', () => {
  it('renders loading, error, and empty states', () => {
    query = { ...query, data: undefined, isLoading: true }
    const view = render(<RecoveryApplicationsListPage />)
    expect(screen.getByRole('status', { name: 'Loading recovery applications...' })).toBeInTheDocument()
    query = { ...query, isLoading: false, error: new Error('offline') }
    view.rerender(<RecoveryApplicationsListPage />)
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('offline')
    query = { ...query, error: null, data: [] }
    view.rerender(<RecoveryApplicationsListPage />)
    expect(screen.getByText('No recovery applications defined yet')).toBeInTheDocument()
  })

  it('navigates to create and encoded edit routes without the json extension', async () => {
    const user = userEvent.setup()
    query = {
      ...query,
      data: [{
        id: 'finance app.json',
        data: {
          application: {
            name: 'Finance',
            description: '',
            environment: 'prod',
            platform: 'VMware',
            source_connection: '',
            target_connection: '',
            tiers: {},
          },
        },
      }],
    }
    render(<RecoveryApplicationsListPage />)
    await user.click(screen.getByRole('button', { name: 'Create Application' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications/create')
    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications/finance%20app/edit')
  })
})
