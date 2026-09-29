import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppPoliciesPage } from './RecoveryAppPoliciesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function stubFetch() {
  const policy = {
    id: 'critical-daily-latest',
    name: 'Critical — Daily DR Test',
    description: 'Daily recovery validation.',
    level: 'critical',
    frequency_value: 1,
    frequency_unit: 'days',
    retention_value: 4,
    retention_unit: 'hours',
    boot_verify: true,
    snapshot_selection_mode: 'latest',
    snapshot_max_age_value: null,
    snapshot_max_age_unit: null,
    snapshot_target_time: null,
    enabled: true,
  }
  const mock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/api/get_recovery_app_policies')) {
      return Promise.resolve(new Response(JSON.stringify({ recovery_app_policies: [policy] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_recovery_app_policy') && method === 'DELETE') {
      expect(url).toBe(`/api/delete_recovery_app_policy?policy_id=${policy.id}`)
      return Promise.resolve(new Response(JSON.stringify({ recovery_app_policies: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('RecoveryAppPoliciesPage refetch', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders the stubbed list through the real select and refetches after a delete', async () => {
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderWithProviders(<RecoveryAppPoliciesPage />)

    await screen.findByText('Critical — Daily DR Test')
    await user.click(screen.getByText('Critical — Daily DR Test'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete recovery app policy' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => url)
      expect(urls.filter(url => url.startsWith('/api/get_recovery_app_policies'))).toHaveLength(2)
    })
  })
})
