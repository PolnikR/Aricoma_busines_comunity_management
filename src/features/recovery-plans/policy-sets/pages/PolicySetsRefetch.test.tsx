import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PolicySetsPage } from './PolicySetsPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}

function response(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function stubFetch(options: { refreshResponse?: () => Promise<Response>; deleteResponse?: Promise<Response> } = {}) {
  let reads = 0
  const policySet = {
    id: 'tier2-apps',
    name: 'Tier 2 applications',
    description: 'Policy set using the medium-tier, 6-hour cadence.',
    snapshot_policy_id: 'medium-6h',
    recovery_app_policy_id: 'critical-daily-latest',
    clean_room_policy_id: 'enforce-clean-target',
  }
  const mock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/api/get_policy_sets')) {
      reads++
      if (reads > 1) return options.refreshResponse?.() ?? Promise.resolve(response({ policy_sets: [] }))
      return Promise.resolve(new Response(JSON.stringify({ policy_sets: [policySet] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_policy_set') && method === 'DELETE') {
      expect(url).toBe(`/api/delete_policy_set?policy_set_id=${policySet.id}`)
      if (options.deleteResponse) return options.deleteResponse
      return Promise.resolve(new Response(JSON.stringify({ policy_sets: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/get_policies')) {
      return Promise.resolve(new Response(JSON.stringify({ snapshot_policies: [] }), { status: 200 }))
    }
    if (url.startsWith('/api/get_recovery_app_policies')) {
      return Promise.resolve(new Response(JSON.stringify({ recovery_app_policies: [] }), { status: 200 }))
    }
    if (url.startsWith('/api/get_clean_room_policies')) {
      return Promise.resolve(new Response(JSON.stringify({ clean_room_policies: [] }), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

async function deleteRecord() {
  const user = userEvent.setup()
  await screen.findByText('Tier 2 applications')
  await user.click(screen.getByRole('row', { name: 'Tier 2 applications' }))
  await user.click(screen.getByRole('button', { name: 'Delete' }))
  await user.click(within(screen.getByRole('dialog', { name: 'Delete policy set' })).getByRole('button', { name: 'Delete' }))
}

function getCount(mock: ReturnType<typeof stubFetch>) {
  return mock.mock.calls.filter(([url]) => url.startsWith('/api/get_policy_sets')).length
}

describe('PolicySetsPage refetch', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('replaces only rows during the post-delete GET and preserves search and page-size', async () => {
    const refresh = deferred()
    const fetchMock = stubFetch({ refreshResponse: () => refresh.promise })
    renderWithQueryClient(<PolicySetsPage />)
    await screen.findByText('Tier 2 applications')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search policy sets' }), 'Tier')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '25')
    await deleteRecord()
    expect(await screen.findByRole('status', { name: 'Loading policy sets' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('row', { name: 'Tier 2 applications' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Delete policy set' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Search policy sets' })).toHaveValue('Tier')
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('25')
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
    expect(getCount(fetchMock)).toBe(2)
    await act(async () => { refresh.resolve(response({ policy_sets: [] })); await refresh.promise })
    await waitFor(() => { expect(screen.queryByRole('status', { name: 'Loading policy sets' })).not.toBeInTheDocument() })
    expect(screen.queryByRole('row', { name: 'Tier 2 applications' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).not.toBeDisabled()
    expect(getCount(fetchMock)).toBe(2)
  })

  it('uses one list GET even when the post-delete response resolves immediately', async () => {
    const fetchMock = stubFetch()
    renderWithQueryClient(<PolicySetsPage />)
    await deleteRecord()
    await waitFor(() => { expect(screen.queryByRole('row', { name: 'Tier 2 applications' })).not.toBeInTheDocument() })
    expect(screen.queryByRole('status', { name: 'Loading policy sets' })).not.toBeInTheDocument()
    expect(getCount(fetchMock)).toBe(2)
  })

  it('retains ordinary cached rows during a manual background refresh', async () => {
    const refresh = deferred()
    stubFetch({ refreshResponse: () => refresh.promise })
    renderWithQueryClient(<PolicySetsPage />)
    await screen.findByText('Tier 2 applications')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(screen.getByRole('row', { name: 'Tier 2 applications' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading policy sets' })).not.toBeInTheDocument()
    await act(async () => { refresh.resolve(response({ policy_sets: [] })); await refresh.promise })
  })

  it('waits for DELETE success before skeletonizing the list', async () => {
    const deletion = deferred()
    const refresh = deferred()
    stubFetch({ deleteResponse: deletion.promise, refreshResponse: () => refresh.promise })
    renderWithQueryClient(<PolicySetsPage />)
    await deleteRecord()
    expect(screen.getByRole('dialog', { name: 'Delete policy set' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Tier 2 applications' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading policy sets' })).not.toBeInTheDocument()
    await act(async () => { deletion.resolve(response({ policy_sets: [] })); await deletion.promise })
    await screen.findByRole('status', { name: 'Loading policy sets' })
    await act(async () => { refresh.resolve(response({ policy_sets: [] })); await refresh.promise })
  })

  it('does not refresh or show a skeleton when DELETE fails', async () => {
    const fetchMock = stubFetch({ deleteResponse: Promise.resolve(response({ detail: 'Policy set is in use.' }, 409)) })
    renderWithQueryClient(<PolicySetsPage />)
    await deleteRecord()
    expect(await screen.findByRole('alert')).toHaveTextContent('Policy set is in use.')
    expect(screen.getByRole('row', { name: 'Tier 2 applications' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading policy sets' })).not.toBeInTheDocument()
    expect(getCount(fetchMock)).toBe(1)
  })

  it('explains a failed post-delete GET and retries only GET with a visible row skeleton', async () => {
    const retry = deferred()
    let attempts = 0
    const fetchMock = stubFetch({ refreshResponse: () => ++attempts === 1 ? Promise.resolve(response({ detail: 'List unavailable.' }, 503)) : retry.promise })
    renderWithQueryClient(<PolicySetsPage />)
    await deleteRecord()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Deleted, but the list could not be refreshed')
    expect(alert).toHaveTextContent('Previous data is shown and may still contain the deleted record.')
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }))
    await screen.findByRole('status', { name: 'Loading policy sets' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => { retry.resolve(response({ policy_sets: [] })); await retry.promise })
    await waitFor(() => { expect(screen.queryByRole('status', { name: 'Loading policy sets' })).not.toBeInTheDocument() })
    expect(getCount(fetchMock)).toBe(3)
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1)
  })
})
