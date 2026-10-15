import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { ResourcesIsePage } from '@/features/discovery-inventory/resources-ise/pages/ResourcesIsePage'
import { useRecoveryGroupResourceInventory } from '@/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory'
import { useInitialResourcePrefetch } from '../hooks/useInitialResourcePrefetch'
import { vmwareInventoryQuery } from '../model/inventoryQueries'
import { emptyPowerResponse, emptyVolumesResponse } from '../test/discoveryFetch'
import { ResourcesPage } from './ResourcesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
let client: QueryClient
let scheduled: () => void

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  window.sessionStorage.clear()
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => { scheduled = callback; return 1 })
  vi.stubGlobal('cancelIdleCallback', vi.fn())
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

const cases = [
  { type: 'VMWARE', workload: 'vmware_virtual_machines' as const, endpoint: '/api/vms/search', payload: { count: 1, vms: [{ name: 'VM-01' }] } },
  { type: 'IBM_POWER', workload: 'ibm_power_virtual_machines' as const, endpoint: '/api/get_power_vm', payload: emptyPowerResponse },
  { type: 'FLASHCOPY', workload: 'ibm_flashsystem' as const, endpoint: '/api/get_volumes', payload: emptyVolumesResponse },
]

describe('Dashboard inventory preparation consumed by Resources and Recovery Groups', () => {
  it.each(cases)('shares initial $type source/target data with actual pages and RG observers', async ({ type, workload, endpoint, payload }) => {
    const fetchMock = vi.fn((input: string) => {
      const body = input.includes('/get_providers') ? { providers: ['source', 'target'].map(role => ({ id: role, name: role, type, role, credentialStatus: 'ok' })) }
        : input.includes('/tags') ? { tags: [] } : payload
      return Promise.resolve(new Response(JSON.stringify(body)))
    })
    vi.stubGlobal('fetch', fetchMock)
    const prefetch = renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await act(async () => { scheduled(); await Promise.resolve() })
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    prefetch.unmount()
    const inventoryCalls = () => fetchMock.mock.calls.filter(([url]) => url.startsWith(endpoint))
    expect(inventoryCalls().map(([url]) => url)).toEqual([`${endpoint}?provider_id=source`, `${endpoint}?provider_id=target`])

    const page = render(<ResourcesPage />, { wrapper })
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    page.rerender(<ResourcesIsePage />)
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    page.rerender(<ResourcesPage />)
    const rg = renderHook(() => useRecoveryGroupResourceInventory(workload, 'source', { providerScope: null }), { wrapper })
    await waitFor(() => { expect(rg.result.current.isSuccess).toBe(true) })
    expect(rg.result.current.data?.resourceNames).toEqual(type === 'VMWARE' ? ['VM-01'] : [])
    expect(inventoryCalls()).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/get_providers'))).toHaveLength(1)
  })

  it('refetches an invalidated or stale key and isolates a different RG scope', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ count: 1, vms: [{ name: 'NEW' }] }))))
    vi.stubGlobal('fetch', fetchMock)
    const options = vmwareInventoryQuery({ providerId: 'source' })
    client.setQueryData(options.queryKey, { count: 1, vms: [{ name: 'OLD' }] })
    await client.invalidateQueries({ queryKey: options.queryKey, exact: true, refetchType: 'none' })
    const first = renderHook(() => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'source', { providerScope: null }), { wrapper })
    await waitFor(() => { expect(first.result.current.data?.resourceNames).toEqual(['NEW']) })
    first.unmount()
    client.setQueryData(options.queryKey, { count: 1, vms: [{ name: 'OLD' }] }, { updatedAt: Date.now() - STANDARD_STALE_TIME_MS - 1 })
    const stale = renderHook(() => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'source', { providerScope: null }), { wrapper })
    await waitFor(() => { expect(stale.result.current.data?.resourceNames).toEqual(['NEW']) })
    stale.unmount()
    const scoped = renderHook(() => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'source', { providerScope: { vmTags: ['prod'] } }), { wrapper })
    await waitFor(() => { expect(scoped.result.current.isSuccess).toBe(true) })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vms/search?provider_id=source', expect.objectContaining({ body: '{"tag":"prod"}' }))
  })

  it('mounts an observer during a pending prefetch and retries after a failed prefetch', async () => {
    let resolve!: (response: Response) => void
    const fetchMock = vi.fn<() => Promise<Response>>().mockImplementationOnce(() => new Promise<Response>(done => { resolve = done }))
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ count: 1, vms: [{ name: 'RECOVERED' }] }))))
    vi.stubGlobal('fetch', fetchMock)
    const options = vmwareInventoryQuery({ providerId: 'source' })
    const pending = client.prefetchQuery(options)
    const observer = renderHook(() => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'source', { providerScope: null }), { wrapper })
    expect(observer.result.current.isLoading).toBe(true)
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    await act(async () => { resolve(new Response(JSON.stringify({ count: 1, vms: [{ name: 'PENDING' }] }))); await pending })
    await waitFor(() => { expect(observer.result.current.data?.resourceNames).toEqual(['PENDING']) })
    observer.unmount()
    client.removeQueries({ queryKey: options.queryKey, exact: true })
    await client.prefetchQuery(options)
    const retry = renderHook(() => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'source', { providerScope: null }), { wrapper })
    await waitFor(() => { expect(retry.result.current.data?.resourceNames).toEqual(['RECOVERED']) })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
