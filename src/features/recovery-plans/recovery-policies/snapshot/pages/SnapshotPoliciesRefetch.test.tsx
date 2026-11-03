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

function stubFetch(refreshResponse: Promise<Response>, options: { preflight?: () => Promise<Response>; deleteResponse?: Promise<Response> } = {}) {
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
    if (url.startsWith('/api/get_policy_sets')) {
      return options.preflight?.() ?? Promise.resolve(new Response(JSON.stringify({ policy_sets: [] }), { status: 200 }))
    }
    if (url.startsWith('/api/get_policies')) {
      if (++reads > 1) return refreshResponse
      return Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [policy] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_policy') && method === 'DELETE') {
      expect(url).toBe(`/api/delete_policy?policy_id=${policy.id}`)
      if (options.deleteResponse) return options.deleteResponse
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

  it.each([1, 2])('blocks deletion and shows all %s policy set references above the retained detail', async count => {
    const fetchMock = stubFetch(Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [] }))), {
      preflight: () => Promise.resolve(new Response(JSON.stringify({ policy_sets: Array.from({ length: count }, (_, index) => ({ id: `set-${String(index)}`, name: `Blocking set ${String(index)}`, snapshot_policy_id: 'critical-15m' })) }))),
    })
    renderWithProviders(<SnapshotPoliciesPage />)
    await userEvent.click(await screen.findByText('Critical — 15 min'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete snapshot policy' })).getByRole('button', { name: 'Delete' }))
    const result = await screen.findByRole('dialog', { name: 'Cannot delete an item that is in use' })
    for (let index = 0; index < count; index++) expect(result).toHaveTextContent(`Blocking set ${String(index)}`)
    expect(screen.queryByRole('dialog', { name: 'Delete snapshot policy' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Snapshot policy detail' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
    expect(fetchMock.mock.calls.find(([url]) => url.startsWith('/api/get_policy_sets'))?.[1]?.cache).toBe('no-store')
    await userEvent.click(within(result).getByRole('button', { name: 'Close', exact: true }))
    expect(within(screen.getByRole('dialog', { name: 'Snapshot policy detail' })).getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it.each([403, 503])('does not delete when checking policy sets fails with %s', async status => {
    const fetchMock = stubFetch(Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [] }))), {
      preflight: () => Promise.resolve(new Response(JSON.stringify({ detail: 'Dependencies unavailable' }), { status })),
    })
    renderWithProviders(<SnapshotPoliciesPage />)
    await userEvent.click(await screen.findByText('Critical — 15 min'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete snapshot policy' })).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('dialog', { name: 'Could not verify usage' })).toHaveTextContent('Policy Sets')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
  })

  it('keeps confirmation locked through checking and deleting, then uses the original refresh flow', async () => {
    const check = deferred()
    const deletion = deferred()
    const refresh = deferred()
    const fetchMock = stubFetch(refresh.promise, { preflight: () => check.promise, deleteResponse: deletion.promise })
    const user = userEvent.setup()
    renderWithProviders(<SnapshotPoliciesPage />)
    await user.click(await screen.findByText('Critical — 15 min'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmation = screen.getByRole('dialog', { name: 'Delete snapshot policy' })
    await user.dblClick(within(confirmation).getByRole('button', { name: 'Delete' }))
    expect(within(confirmation).getByRole('button', { name: 'Checking usage…' })).toBeDisabled()
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(confirmation).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/get_policy_sets'))).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
    await act(async () => { check.resolve(new Response(JSON.stringify({ policy_sets: [] }))); await check.promise })
    expect(await within(confirmation).findByRole('button', { name: 'Deleting...' })).toBeDisabled()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1)
    await act(async () => { deletion.resolve(new Response(JSON.stringify({ snapshot_policies: [] }))); await deletion.promise })
    await screen.findByRole('status', { name: 'Loading snapshot policies' })
    await act(async () => { refresh.resolve(new Response(JSON.stringify({ snapshot_policies: [] }))); await refresh.promise })
  })

  it('checks again after references are removed and a blocked deletion is retried', async () => {
    let checks = 0
    const fetchMock = stubFetch(Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [] }))), {
      preflight: () => Promise.resolve(new Response(JSON.stringify({ policy_sets: ++checks === 1 ? [{ id: 'set-1', name: 'Blocking set', snapshot_policy_id: 'critical-15m' }] : [] }))),
    })
    renderWithProviders(<SnapshotPoliciesPage />)
    await userEvent.click(await screen.findByText('Critical — 15 min'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete snapshot policy' })).getByRole('button', { name: 'Delete' }))
    const notice = await screen.findByRole('dialog', { name: 'Cannot delete an item that is in use' })
    await userEvent.click(within(notice).getByRole('button', { name: 'Close', exact: true }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Snapshot policy detail' })).getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete snapshot policy' })).getByRole('button', { name: 'Delete' }))
    await waitFor(() => { expect(screen.queryByRole('row', { name: 'Critical — 15 min' })).not.toBeInTheDocument() })
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/get_policy_sets'))).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1)
  })

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
