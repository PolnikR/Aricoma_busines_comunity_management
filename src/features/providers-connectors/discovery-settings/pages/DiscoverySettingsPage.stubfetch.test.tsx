import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiscoverySettingsPage } from './DiscoverySettingsPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function renderWithQueryClient(initialEntry = '/providers-connectors/discovery-settings') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <DiscoverySettingsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const historyRuns = [
  {
    provider_id: 'vmware-01',
    provider_type: 'VMWARE',
    triggered_by: 'stale',
    started_at: '2026-08-29T09:10:11Z',
    duration_ms: 125,
    success: true,
    record_count: 42,
  },
  {
    provider_id: 'power-01',
    provider_type: 'IBM_POWER',
    triggered_by: 'forced',
    started_at: '2026-08-30T10:20:30Z',
    duration_ms: 2400,
    success: false,
    record_count: null,
  },
]

function stubFetch() {
  const configPayload = { defaults: { VMWARE: 300, CUSTOM_ENGINE: 600 }, history_retention: { retention_days: 30, max_records: 100 } }
  const mock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url === '/api/discovery/cache/config' && method === 'GET') {
      return Promise.resolve(new Response(JSON.stringify(configPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url === '/api/discovery/cache/config' && method === 'PUT') {
      expect(init?.body).toBe(JSON.stringify({ defaults: { VMWARE: 120 } }))
      return Promise.resolve(new Response(JSON.stringify({ ...configPayload, defaults: { ...configPayload.defaults, VMWARE: 120 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/discovery/cache/history')) {
      return Promise.resolve(new Response(JSON.stringify({ runs: historyRuns }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.startsWith('/api/get_providers')) {
      return Promise.resolve(new Response(JSON.stringify({ providers: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('DiscoverySettingsPage against the real discovery-cache endpoints', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('refetches the cache config after saving a change', async () => {
    const fetchMock = stubFetch()
    const user = userEvent.setup()
    renderWithQueryClient()

    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const vmwareTtl = await within(cache).findByLabelText('VMware cache TTL (seconds)')
    await user.clear(vmwareTtl)
    await user.type(vmwareTtl, '120')
    await user.click(within(cache).getByRole('button', { name: 'Save cache configuration' }))

    await waitFor(() => {
      const configGets = fetchMock.mock.calls.filter(([url, init]) => url === '/api/discovery/cache/config' && (init?.method ?? 'GET') === 'GET')
      expect(configGets).toHaveLength(2)
    })
  })

  it('renders discovery history rows fetched and selected through the real hook', async () => {
    const fetchMock = stubFetch()
    renderWithQueryClient('/providers-connectors/discovery-settings?tab=history')

    const history = await screen.findByRole('region', { name: 'Discovery history' })
    const table = await within(history).findByLabelText('Discovery history runs')

    expect(await within(table).findByText('vmware-01')).toBeInTheDocument()
    expect(within(table).getByText('power-01')).toBeInTheDocument()
    expect(within(table).getByText('125 ms')).toBeInTheDocument()
    expect(within(table).getByText('42')).toBeInTheDocument()

    await waitFor(() => {
      const historyGets = fetchMock.mock.calls.map(([url]) => url).filter(url => url.startsWith('/api/discovery/cache/history'))
      expect(historyGets).toContain('/api/discovery/cache/history?limit=100')
    })
  })

  it('requests discovery history filtered by the deep-linked provider id', async () => {
    const fetchMock = stubFetch()
    renderWithQueryClient('/providers-connectors/discovery-settings?tab=history&providerId=vmware-01')

    await screen.findByRole('region', { name: 'Discovery history' })

    await waitFor(() => {
      const historyGets = fetchMock.mock.calls.map(([url]) => url).filter(url => url.startsWith('/api/discovery/cache/history'))
      expect(historyGets).toContain('/api/discovery/cache/history?provider_id=vmware-01&limit=100')
    })
  })
})
