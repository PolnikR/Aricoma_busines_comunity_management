import { StrictMode, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { ResourcesIsePage } from '@/features/discovery-inventory/resources-ise/pages/ResourcesIsePage'
import { useInitialResourcePrefetch } from '../hooks/useInitialResourcePrefetch'
import { vmwareInventoryQuery } from '../model/inventoryQueries'
import { writeProviderFilterSnapshot } from '../state/providerFilterSession'
import { ResourcesPage } from './ResourcesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

interface ProviderFixture {
  id: string
  name: string
  type: string
  role?: string
  credentialStatus: string
  vmPrefix?: string
  vmTags?: string[]
}

const providers: ProviderFixture[] = [
  { id: 'vm-30', name: 'VMware 30', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'target', name: 'VMware 1', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
  { id: 'vm-10', name: 'VMware 10', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'vm-2', name: 'VMware 2', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
]
let client: QueryClient
let callbacks: Map<number, () => void>
let nextCallback: number
let secondResponse: () => Promise<Response>
let firstResponse: () => Promise<Response>
let availableProviders: ProviderFixture[]
let initialEntry: string
let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function inventory(name: string) { return { count: 1, vms: [{ name, tags: ['prod', 'first-tag'] }] } }

function wrapper({ children }: PropsWithChildren) {
  return <StrictMode><QueryClientProvider client={client}><MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter></QueryClientProvider></StrictMode>
}

function inventoryCalls(id: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api/vms/search?provider_id=${id}`)
}

async function idle() {
  await act(async () => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach(callback => { callback() })
    await Promise.resolve()
  })
}

async function prepareDashboard() {
  const dashboard = renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
  await idle()
  await waitFor(() => { expect(client.isFetching()).toBe(0) })
  dashboard.unmount()
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  callbacks = new Map()
  nextCallback = 0
  window.sessionStorage.clear()
  initialEntry = '/'
  availableProviders = providers
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => { callbacks.set(++nextCallback, callback); return nextCallback })
  vi.stubGlobal('cancelIdleCallback', (id: number) => { callbacks.delete(id) })
  secondResponse = () => Promise.resolve(json(inventory('SECOND')))
  firstResponse = () => Promise.resolve(json(inventory('FIRST')))
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/get_providers')) return json({ providers: availableProviders })
    if (url.includes('/tags')) return json({ tags: [] })
    if (url === '/api/vms/search?provider_id=vm-10') return secondResponse()
    if (url === '/api/vms/search?provider_id=vm-2') return firstResponse()
    if (url.startsWith('/api/vms/search?provider_id=')) return json(inventory('OTHER'))
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Resources background VMware prefetch', () => {
  it('starts only the second sorted source inventory after the first tab is usable and idle', async () => {
    await prepareDashboard()
    expect(inventoryCalls('vm-10')).toHaveLength(0)
    render(<ResourcesPage />, { wrapper })
    expect(await screen.findByText('FIRST')).toBeVisible()
    expect(inventoryCalls('vm-10')).toHaveLength(0)
    await waitFor(() => { expect(callbacks.size).toBeGreaterThan(0) })
    await idle()
    await waitFor(() => { expect(inventoryCalls('vm-10')).toHaveLength(1) })
    expect(inventoryCalls('vm-2')).toHaveLength(1)
    expect(inventoryCalls('vm-30')).toHaveLength(0)
    expect(inventoryCalls('target')).toHaveLength(1) // Existing Dashboard target preparation only.
    expect(screen.getByText('FIRST')).toBeVisible()
  })

  it('joins the pending HTTP request when the second tab is clicked', async () => {
    let resolve!: (response: Response) => void
    secondResponse = () => new Promise<Response>(done => { resolve = done })
    await prepareDashboard()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(inventoryCalls('vm-10')).toHaveLength(1) })
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    expect(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('FIRST')).not.toBeInTheDocument()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    await act(async () => { resolve(json(inventory('SECOND'))); await Promise.resolve() })
    expect(await screen.findByText('SECOND')).toBeVisible()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
  })

  it('reuses completed fresh data across tab switches and remounts', async () => {
    await prepareDashboard()
    const page = render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    expect(await screen.findByText('SECOND')).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 2' }))
    await screen.findByText('FIRST')
    await idle()
    page.unmount()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
  })

  it('waits for a cold active inventory before scheduling background work', async () => {
    let resolve!: (response: Response) => void
    firstResponse = () => new Promise<Response>(done => { resolve = done })
    render(<ResourcesPage />, { wrapper })
    await waitFor(() => { expect(inventoryCalls('vm-2')).toHaveLength(1) })
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(0)
    expect(callbacks.size).toBe(0)
    await act(async () => { resolve(json(inventory('FIRST'))); await Promise.resolve() })
    await screen.findByText('FIRST')
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
  })

  it('also prepares the second provider after a successful empty active inventory', async () => {
    firstResponse = () => Promise.resolve(json({ count: 0, vms: [] }))
    await prepareDashboard()
    render(<ResourcesPage />, { wrapper })
    await waitFor(() => { expect(callbacks.size).toBeGreaterThan(0) })
    expect(screen.getByRole('searchbox', { name: 'Search virtual machines' })).toBeVisible()
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
  })

  it('ignores even a late invocation of a cancelled callback after unmount', async () => {
    await prepareDashboard()
    const page = render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    const queued = [...callbacks.values()]
    expect(queued.length).toBeGreaterThan(0)
    page.unmount()
    expect(callbacks.size).toBe(0)
    await act(async () => { queued.forEach(callback => { callback() }); await Promise.resolve() })
    expect(inventoryCalls('vm-10')).toHaveLength(0)
  })

  it('uses the timer fallback without idle callback support', async () => {
    await prepareDashboard()
    vi.stubGlobal('requestIdleCallback', undefined)
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await waitFor(() => { expect(inventoryCalls('vm-10')).toHaveLength(1) })
  })

  it.each(['single source', 'missing credentials', 'second active', 'target page'])(
    'does not speculate for %s', async scenario => {
      if (scenario === 'single source') availableProviders = providers.filter(provider => provider.id !== 'vm-10' && provider.id !== 'vm-30')
      if (scenario === 'missing credentials') availableProviders = providers.map(provider => provider.id === 'vm-10' ? { ...provider, credentialStatus: 'missing' } : provider)
      if (scenario === 'second active') initialEntry = '/?providerId=vm-10'
      render(scenario === 'target page' ? <ResourcesIsePage /> : <ResourcesPage />, { wrapper })
      await screen.findByRole('searchbox', { name: 'Search virtual machines' })
      await waitFor(() => { expect(client.isFetching()).toBe(0) })
      await idle()
      expect(inventoryCalls('vm-10')).toHaveLength(scenario === 'second active' ? 1 : 0)
      expect(inventoryCalls('vm-30')).toHaveLength(0)
      expect(inventoryCalls('vm-2')).toHaveLength(scenario === 'target page' || scenario === 'second active' ? 0 : 1)
    },
  )

  it('retains the existing source fallback for a provider without an explicit role', async () => {
    availableProviders = providers.map(provider => {
      if (provider.id !== 'vm-10') return provider
      const unclassified = { ...provider }
      delete unclassified.role
      return unclassified
    })
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
  })

  it.each(['fixed', 'snapshot', 'defaults'])('matches the destination query using %s filters', async mode => {
    const filters = { search: 'SECOND', tags: ['prod'], powerState: '', connectionState: '', cluster: '', untagged: false }
    if (mode === 'fixed') availableProviders = providers.map(provider => provider.id === 'vm-10'
      ? { ...provider, vmPrefix: ' SECOND ', vmTags: ['', ' prod '] } : provider)
    if (mode === 'snapshot') writeProviderFilterSnapshot({ role: 'source', resourceTab: 'vmware', providerId: 'vm-10' }, {
      resourceTab: 'vmware', initialized: true, filters,
    })
    writeProviderFilterSnapshot({ role: 'target', resourceTab: 'vmware', providerId: 'vm-10' }, {
      resourceTab: 'vmware', initialized: true, filters: { ...filters, search: 'WRONG-TARGET', tags: ['wrong'] },
    })
    initialEntry = '/?search=FIRST&tags=first-tag'
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    expect(inventoryCalls('vm-10')[0]?.[1]?.body).toBe(mode === 'defaults' ? '{}' : '{"tag":"prod","name_prefix":"SECOND"}')
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    expect(await screen.findByText('SECOND')).toBeVisible()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    expect(screen.getByRole('searchbox', { name: 'Search virtual machines' })).toHaveValue(mode === 'defaults' ? '' : 'SECOND')
  })

  it('does not retry speculative errors on rerender or remount, but recovers when opened', async () => {
    secondResponse = () => Promise.resolve(json({ detail: 'offline' }, 500))
    await prepareDashboard()
    const page = render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    page.rerender(<ResourcesPage />)
    await idle()
    page.unmount()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    secondResponse = () => Promise.resolve(json(inventory('RECOVERED')))
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    expect(await screen.findByText('RECOVERED')).toBeVisible()
    expect(inventoryCalls('vm-10')).toHaveLength(2)
  })

  it('preserves the single configured retry without a background retry loop', async () => {
    client.setDefaultOptions({ queries: { ...STANDARD_QUERY_OPTIONS, retryDelay: 0 } })
    secondResponse = () => Promise.reject(new Error('offline'))
    await prepareDashboard()
    const page = render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(inventoryCalls('vm-10')).toHaveLength(2)
    page.unmount()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(2)
  })

  it('shows the normal error UI when the shared pending request fails after switching', async () => {
    let resolve!: (response: Response) => void
    secondResponse = () => new Promise<Response>(done => { resolve = done })
    await prepareDashboard()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    await act(async () => { resolve(json({ detail: 'offline' }, 500)); await Promise.resolve() })
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.queryByText('FIRST')).not.toBeInTheDocument()
    expect(inventoryCalls('vm-10')).toHaveLength(1)
  })

  it('fetches a new search instead of reusing a differently filtered prefetched entry', async () => {
    await prepareDashboard()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    await screen.findByText('SECOND')
    secondResponse = () => Promise.resolve(json(inventory('CHANGED')))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search virtual machines' }), { target: { value: 'CHANGED' } })
    expect(await screen.findByText('CHANGED')).toBeVisible()
    expect(inventoryCalls('vm-10')).toHaveLength(2)
    expect(inventoryCalls('vm-10')[1]?.[1]?.body).toBe('{"name_prefix":"CHANGED"}')
  })

  it('replaces prefetched rows through the existing force refresh command', async () => {
    await prepareDashboard()
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · VMware 10' }))
    await screen.findByText('SECOND')
    secondResponse = () => Promise.resolve(json(inventory('LIVE')))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('LIVE')).toBeVisible()
    expect(inventoryCalls('vm-10')).toHaveLength(2)
    expect(inventoryCalls('vm-10')[1]?.[1]?.body).toBe('{"force_refresh":true}')
  })

  it.each(['stale', 'invalidated'])('refetches a %s destination key on a later visit', async mode => {
    await prepareDashboard()
    const page = render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    page.unmount()
    const options = vmwareInventoryQuery({ providerId: 'vm-10' })
    if (mode === 'stale') client.setQueryData(options.queryKey, inventory('OLD'), { updatedAt: Date.now() - STANDARD_STALE_TIME_MS - 1 })
    else await client.invalidateQueries({ queryKey: options.queryKey, exact: true, refetchType: 'none' })
    render(<ResourcesPage />, { wrapper })
    await screen.findByText('FIRST')
    await idle()
    await waitFor(() => { expect(inventoryCalls('vm-10')).toHaveLength(2) })
  })
})
