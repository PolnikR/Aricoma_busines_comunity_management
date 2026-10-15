import { StrictMode, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { writeProviderFilterSnapshot } from '../state/providerFilterSession'
import { useInitialResourcePrefetch } from './useInitialResourcePrefetch'

const providers = [
  { id: 'source', name: 'A source', type: 'VMWARE', role: 'source', credentialStatus: 'ok', vmPrefix: ' FIXED ', vmTags: ['', ' prod '] },
  { id: 'target', name: 'A target', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
  ...Array.from({ length: 20 }, (_, i) => ({ id: `other-${String(i)}`, name: `Z other ${String(i)}`, type: 'VMWARE', role: 'source', credentialStatus: 'ok' })),
]
let client: QueryClient
let scheduled: () => void
type FetchInventory = (input: string, init?: RequestInit) => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn<FetchInventory>>

function wrapper({ children }: PropsWithChildren) {
  return <StrictMode><QueryClientProvider client={client}>{children}</QueryClientProvider></StrictMode>
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  window.sessionStorage.clear()
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => { scheduled = callback; return 1 })
  vi.stubGlobal('cancelIdleCallback', vi.fn())
  fetchMock = vi.fn<FetchInventory>((input: string) => Promise.resolve(new Response(JSON.stringify(input.includes('/get_providers') ? { providers } : { count: 0, vms: [] }), { status: 200 })))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals() })

describe('useInitialResourcePrefetch', () => {
  it('waits for ready and idle, then prepares only the initial source and target searches', async () => {
    writeProviderFilterSnapshot({ role: 'target', resourceTab: 'vmware', providerId: 'target' }, {
      resourceTab: 'vmware', initialized: true,
      filters: { search: 'saved-', tags: ['blue'], powerState: '', connectionState: '', cluster: '', untagged: false },
    })
    const { rerender } = renderHook(({ ready }) => { useInitialResourcePrefetch(ready) }, { wrapper, initialProps: { ready: false } })
    expect(fetchMock).not.toHaveBeenCalled()
    rerender({ ready: true })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => { scheduled(); await Promise.resolve() })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(3) })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/get_providers?role=all', '/api/vms/search?provider_id=source', '/api/vms/search?provider_id=target',
    ])
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe('{"tag":"prod","name_prefix":"FIXED"}')
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe('{"tag":"blue","name_prefix":"saved-"}')
    rerender({ ready: false })
    rerender({ ready: true })
    await act(async () => { scheduled(); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not start inventory when provider metadata settles after unmount', async () => {
    let resolve!: (value: Response) => void
    fetchMock.mockImplementation(() => new Promise<Response>(done => { resolve = done }))
    const { unmount } = renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await act(async () => { scheduled(); await Promise.resolve() })
    unmount()
    await act(async () => { resolve(new Response(JSON.stringify({ providers }))); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not replace a missing role with unscoped inventory', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ providers: [] })))
    renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await act(async () => { scheduled(); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('leaves metadata failure available for a later normal load', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await act(async () => { scheduled(); await Promise.resolve() })
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(['/get_providers', { role: 'all' }])).toBeUndefined()
  })

  it('uses the first available vendor for each role without prefetching other tabs', async () => {
    fetchMock.mockImplementation((input: string) => Promise.resolve(new Response(JSON.stringify(input.includes('/get_providers') ? {
      providers: [
        { id: 'flash', name: 'Flash', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok' },
        { id: 'power', name: 'Power', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' },
      ],
    } : input.includes('/get_volumes') ? { count: 0, volumes: [], pools: {}, hosts: {}, clusters: {}, consistency_groups: {} }
      : { count: 0, counts_by_type: { LogicalPartition: 0, VirtualIOServer: 0 }, vms: [] }))))
    renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await act(async () => { scheduled(); await Promise.resolve() })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(3) })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/get_providers?role=all', '/api/get_volumes?provider_id=flash', '/api/get_power_vm?provider_id=power',
    ])
  })

  it('skips missing credentials without substituting a different provider', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ providers: providers.map(provider => ({ ...provider, credentialStatus: 'missing' })) })))
    renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await act(async () => { scheduled(); await Promise.resolve() })
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to a timer when idle callbacks are unavailable', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(3) })
  })

  it('cancels a queued callback on unmount and ignores it if it still runs', async () => {
    const { unmount } = renderHook(() => { useInitialResourcePrefetch(true) }, { wrapper })
    unmount()
    await act(async () => { scheduled(); await Promise.resolve() })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
