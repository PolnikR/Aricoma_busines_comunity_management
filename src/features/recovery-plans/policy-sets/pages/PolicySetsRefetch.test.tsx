import { render, screen, waitFor, within } from '@testing-library/react'
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

function stubFetch() {
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
      return Promise.resolve(new Response(JSON.stringify({ policy_sets: [policySet] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/delete_policy_set') && method === 'DELETE') {
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

describe('PolicySetsPage refetch', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('refetches the policy set list after a delete', async () => {
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderWithQueryClient(<PolicySetsPage />)

    await screen.findByText('Tier 2 applications')
    await user.click(screen.getByText('Tier 2 applications'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete policy set' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => url)
      expect(urls.filter(url => url.startsWith('/api/get_policy_sets'))).toHaveLength(2)
    })
  })
})
