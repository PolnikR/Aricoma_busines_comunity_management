import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppPoliciesPage } from './RecoveryAppPoliciesPage'
import { detailSectionsFields } from '@/test-utils/detailView'

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

function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}

function stubFetch(refreshResponse: Promise<Response>, options: { preflight?: () => Promise<Response>; deleteResponse?: Promise<Response> } = {}) {
  let reads = 0
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
    if (url.startsWith('/api/get_policy_sets')) {
      return options.preflight?.() ?? Promise.resolve(new Response(JSON.stringify({ policy_sets: [] }), { status: 200 }))
    }
    if (url.startsWith('/api/get_recovery_app_policies')) {
      if (++reads > 1) return refreshResponse
      return Promise.resolve(new Response(JSON.stringify({ recovery_app_policies: [policy] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_recovery_app_policy') && method === 'DELETE') {
      expect(url).toBe(`/api/delete_recovery_app_policy?policy_id=${policy.id}`)
      if (options.deleteResponse) return options.deleteResponse
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

  it.each([undefined, false, true])('normalizes stop_source_lpar=%s through GET before displaying and editing', async stopSource => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(Response.json({ recovery_app_policies: [{
      id: 'power-legacy', name: 'Power legacy', description: 'Legacy policy', level: 'high',
      frequency_value: 1, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
      source_shutdown_timeout_seconds: 600,
      ...(stopSource === undefined ? {} : { stop_source_lpar: stopSource }),
    }] }))))
    renderWithProviders(<RecoveryAppPoliciesPage />)
    await userEvent.click(await screen.findByText('Power legacy'))
    const detail = screen.getByRole('dialog', { name: 'Recovery app policy detail' })
    expect(detailSectionsFields(detail)['Stop source LPAR']).toBe(stopSource === false ? 'No' : 'Yes')
    await userEvent.click(within(detail).getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('checkbox', { name: 'Stop source LPAR' })).toHaveProperty('checked', stopSource !== false)
    expect(screen.getByLabelText('Source shutdown timeout (seconds)')).toHaveValue(600)
  })

  it.each([1, 2])('blocks deletion and shows all %s policy set references above the retained detail', async count => {
    const fetchMock = stubFetch(Promise.resolve(new Response(JSON.stringify({ recovery_app_policies: [] }))), {
      preflight: () => Promise.resolve(new Response(JSON.stringify({ policy_sets: Array.from({ length: count }, (_, index) => ({ id: `set-${String(index)}`, name: `Blocking set ${String(index)}`, recovery_app_policy_id: 'critical-daily-latest' })) }))),
    })
    renderWithProviders(<RecoveryAppPoliciesPage />)
    await userEvent.click(await screen.findByText('Critical — Daily DR Test'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete recovery app policy' })).getByRole('button', { name: 'Delete' }))
    const result = await screen.findByRole('dialog', { name: 'Cannot delete an item that is in use' })
    for (let index = 0; index < count; index++) expect(result).toHaveTextContent(`Blocking set ${String(index)}`)
    expect(screen.queryByRole('dialog', { name: 'Delete recovery app policy' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Recovery app policy detail' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
    expect(fetchMock.mock.calls.find(([url]) => url.startsWith('/api/get_policy_sets'))?.[1]?.cache).toBe('no-store')
    await userEvent.click(within(result).getByRole('button', { name: 'Close' }))
    expect(within(screen.getByRole('dialog', { name: 'Recovery app policy detail' })).getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it.each([403, 503])('does not delete when checking policy sets fails with %s', async status => {
    const fetchMock = stubFetch(Promise.resolve(new Response(JSON.stringify({ recovery_app_policies: [] }))), {
      preflight: () => Promise.resolve(new Response(JSON.stringify({ detail: 'Dependencies unavailable' }), { status })),
    })
    renderWithProviders(<RecoveryAppPoliciesPage />)
    await userEvent.click(await screen.findByText('Critical — Daily DR Test'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete recovery app policy' })).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('dialog', { name: 'Could not verify usage' })).toHaveTextContent('Policy Sets')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
  })

  it('renders the stubbed list through the real select and refetches after a delete', async () => {
    const refresh = deferred()
    const fetchMock = stubFetch(refresh.promise)
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

    expect(await screen.findByRole('status', { name: "Loading recovery app policies" })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('row', { name: "Critical — Daily DR Test" })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: "Policy" })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible()
    await act(async () => { refresh.resolve(new Response(JSON.stringify({ recovery_app_policies: [] }), { status: 200 })); await refresh.promise })
    await waitFor(() => { expect(screen.queryByRole('status', { name: "Loading recovery app policies" })).not.toBeInTheDocument() })
    expect(screen.queryByRole('row', { name: "Critical — Daily DR Test" })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/get_recovery_app_policies'))).toHaveLength(2)
  })
})
