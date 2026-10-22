import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CleanRoomPoliciesPage } from './CleanRoomPoliciesPage'

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
    id: 'enforce-clean-target',
    name: 'Enforce Clean Target',
    description: 'Remove conflicting target resources before recovery.',
    enabled: true,
  }
  const mock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/api/get_clean_room_policies')) {
      if (++reads > 1) return refreshResponse
      return Promise.resolve(new Response(JSON.stringify({ clean_room_policies: [policy] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_clean_room_policy') && method === 'DELETE') {
      expect(url).toBe(`/api/delete_clean_room_policy?policy_id=${policy.id}`)
      return Promise.resolve(new Response(JSON.stringify({ clean_room_policies: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('CleanRoomPoliciesPage refetch', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders the stubbed list through the real select and refetches after a delete', async () => {
    const refresh = deferred()
    const fetchMock = stubFetch(refresh.promise)
    const user = userEvent.setup()
    renderWithProviders(<CleanRoomPoliciesPage />)

    await screen.findByText('Enforce Clean Target')
    await user.click(screen.getByText('Enforce Clean Target'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete clean room policy' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => url)
      expect(urls.filter(url => url.startsWith('/api/get_clean_room_policies'))).toHaveLength(2)
    })

    expect(await screen.findByRole('status', { name: "Loading clean room policies" })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('row', { name: "Enforce Clean Target" })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: "Policy" })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible()
    await act(async () => { refresh.resolve(new Response(JSON.stringify({ clean_room_policies: [] }), { status: 200 })); await refresh.promise })
    await waitFor(() => { expect(screen.queryByRole('status', { name: "Loading clean room policies" })).not.toBeInTheDocument() })
    expect(screen.queryByRole('row', { name: "Enforce Clean Target" })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/get_clean_room_policies'))).toHaveLength(2)
  })
})
