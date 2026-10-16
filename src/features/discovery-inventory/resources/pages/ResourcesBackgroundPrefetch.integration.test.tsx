import { StrictMode, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { useInitialResourcePrefetch } from '../hooks/useInitialResourcePrefetch'
import { ResourcesPage } from './ResourcesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const providers = [
  { id: 'vm-30', name: 'VMware 30', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'target', name: 'VMware 1', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
  { id: 'vm-10', name: 'VMware 10', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'vm-2', name: 'VMware 2', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
]
let client: QueryClient
let callbacks: Map<number, () => void>
let nextCallback: number
let secondResponse: () => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function inventory(name: string) { return { count: 1, vms: [{ name }] } }

function wrapper({ children }: PropsWithChildren) {
  return <StrictMode><QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider></StrictMode>
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
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => { callbacks.set(++nextCallback, callback); return nextCallback })
  vi.stubGlobal('cancelIdleCallback', (id: number) => { callbacks.delete(id) })
  secondResponse = () => Promise.resolve(json(inventory('SECOND')))
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/get_providers')) return json({ providers })
    if (url.includes('/tags')) return json({ tags: [] })
    if (url === '/api/vms/search?provider_id=vm-10') return secondResponse()
    if (url.startsWith('/api/vms/search?provider_id=')) return json(inventory(url.endsWith('vm-2') ? 'FIRST' : 'OTHER'))
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
})
