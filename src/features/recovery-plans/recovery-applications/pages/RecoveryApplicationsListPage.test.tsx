import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationsListPage } from './RecoveryApplicationsListPage'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

function renderListPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RecoveryApplicationsListPage />
    </QueryClientProvider>,
  )
}

const navigate = vi.fn()
const refetch = vi.fn()
const deleteMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn<
    (application: RecoveryApplicationListItem) => Promise<{ applications: RecoveryApplicationListItem[]; rollback: null }>
  >(),
  isPending: false,
}))
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
vi.mock('../hooks/useDeleteRecoveryApplication', async () => {
  const { useState } = await import('react')

  return {
    useDeleteRecoveryApplication: () => {
      const [error, setError] = useState<Error | null>(null)

      return {
        ...deleteMutation,
        error,
        mutateAsync: async (application: RecoveryApplicationListItem) => {
          setError(null)
          try {
            return await deleteMutation.mutateAsync(application)
          } catch (cause) {
            const mutationError = cause instanceof Error
              ? cause
              : new Error('Delete recovery application failed')
            setError(mutationError)
            throw mutationError
          }
        },
      }
    },
  }
})
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
  it('closes a failed delete dialog and shows backend detail in the list context', async () => {
    const user = userEvent.setup()
    deleteMutation.mutateAsync.mockRejectedValueOnce(new Error('Delete recovery application request failed with status 409', {
      cause: new OrvalApiError(409, 'Conflict', { detail: 'The recovery application is still referenced by a policy.' }),
    }))
    query = {
      ...query,
      data: [{
        id: 'finance-app',
        data: {
          application: {
            name: 'Finance', description: '', environment: 'prod', platform: 'VMware',
            source_connection: '', target_connection: '', tiers: {},
          },
        },
      }],
    }
    renderListPage()

    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmation = screen.getByRole('dialog', { name: 'Delete recovery application' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete recovery application' })).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Delete recovery application')
    })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The recovery application is still referenced by a policy.')
  })

  it('closes the delete dialog without an alert when the mutation succeeds', async () => {
    const user = userEvent.setup()
    deleteMutation.mutateAsync.mockResolvedValueOnce({ applications: [], rollback: null })
    query = {
      ...query,
      data: [{
        id: 'finance-app',
        data: {
          application: {
            name: 'Finance', description: '', environment: 'prod', platform: 'VMware',
            source_connection: '', target_connection: '', tiers: {},
          },
        },
      }],
    }
    renderListPage()

    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmation = screen.getByRole('dialog', { name: 'Delete recovery application' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete recovery application' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders loading, error, and empty states', () => {
    query = { ...query, data: undefined, isLoading: true }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
      <QueryClientProvider client={client}>
        <RecoveryApplicationsListPage />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('status', { name: 'Loading recovery applications...' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recovery Applications' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create Application' })).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Search applications' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Application' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Environment' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
    query = { ...query, isLoading: false, error: new Error('offline') }
    view.rerender(
      <QueryClientProvider client={client}>
        <RecoveryApplicationsListPage />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('offline')
    query = { ...query, error: null, data: [] }
    view.rerender(
      <QueryClientProvider client={client}>
        <RecoveryApplicationsListPage />
      </QueryClientProvider>,
    )
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
    renderListPage()
    await user.click(screen.getByRole('button', { name: 'Create Application' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications/create')
    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications/finance%20app/edit')
  })
})
