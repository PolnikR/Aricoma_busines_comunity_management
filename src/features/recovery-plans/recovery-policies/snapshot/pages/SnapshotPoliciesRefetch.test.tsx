import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SnapshotPoliciesPage } from './SnapshotPoliciesPage'

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

function stubFetch(refreshResponse: Promise<Response>) {
  let reads = 0
  const policy = {
    id: 'critical-15m',
    name: 'Critical — 15 min',
    description: 'Every 15 minutes, retained 3 hours.',
    level: 'critical',
    frequency_value: 15,
    frequency_unit: 'minutes',
    retention_value: 3,
    retention_unit: 'hours',
    max_snapshots: 12,
    enabled: true,
  }
  const mock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/api/get_policies')) {
      if (++reads > 1) return refreshResponse
      return Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [policy] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_policy') && method === 'DELETE') {
      expect(url).toBe(`/api/delete_policy?policy_id=${policy.id}`)
      return Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('SnapshotPoliciesPage refetch', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders the stubbed list through the real select and refetches after a delete', async () => {
    const refresh = deferred()
    const fetchMock = stubFetch(refresh.promise)
    const user = userEvent.setup()
    renderWithProviders(<SnapshotPoliciesPage />)

    await screen.findByText('Critical — 15 min')
    await user.click(screen.getByText('Critical — 15 min'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete snapshot policy' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => url)
      expect(urls.filter(url => url.startsWith('/api/get_policies'))).toHaveLength(2)
    })

    expect(await screen.findByRole('status', { name: "Loading snapshot policies" })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('row', { name: "Critical — 15 min" })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: "Policy" })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible()
    await act(async () => { refresh.resolve(new Response(JSON.stringify({ snapshot_policies: [] }), { status: 200 })); await refresh.promise })
    await waitFor(() => { expect(screen.queryByRole('status', { name: "Loading snapshot policies" })).not.toBeInTheDocument() })
    expect(screen.queryByRole('row', { name: "Critical — 15 min" })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/get_policies'))).toHaveLength(2)
  })
})
