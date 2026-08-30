import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { useVmwareResourceInventory } from './useVmwareResourceInventory'

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createQueryClient(retry: false | number = false) {
  return new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry, retryDelay: 1 } },
  })
}

function inventoryResponse(names: string[]) {
  return new Response(JSON.stringify({
    count: names.length,
    vms: names.map((name) => ({ name })),
  }), { status: 200 })
}

function parseRequestBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== 'string') throw new Error('Expected a JSON request body')
  const parsed: unknown = JSON.parse(init.body)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object request body')
  return parsed as Record<string, unknown>
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useVmwareResourceInventory', () => {
  it.each([
    { namePrefix: '', tag: '', expectedBody: {} },
    { namePrefix: '', tag: 'prod', expectedBody: { tag: 'prod' } },
  ])('uses the matching server filters for $namePrefix/$tag', async ({ namePrefix, tag, expectedBody }) => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix, tag, enabled: true }),
      { wrapper: createWrapper(createQueryClient()) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vms/search?provider_id=vcenter-01',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(expectedBody) }),
    )
  })

  it('waits 300 ms before requesting a name-only prefix and normalizes its result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: 'WEB', enabled: true }),
      { wrapper: createWrapper(createQueryClient()) },
    )

    expect(fetchMock).not.toHaveBeenCalled()

    await new Promise((resolve) => { setTimeout(resolve, 250) })
    expect(fetchMock).not.toHaveBeenCalled()

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vms/search?provider_id=vcenter-01',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name_prefix: 'WEB' }) }),
    )
    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['WEB-01'])
  })

  it('replaces name-only debounce input with one settled request', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: prefix, enabled: true }),
      { wrapper: createWrapper(createQueryClient()), initialProps: { prefix: 'W' } },
    )

    rerender({ prefix: 'WE' })
    rerender({ prefix: 'WEB' })

    expect(result.current.isDebouncing).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => { await vi.advanceTimersByTimeAsync(299) })
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vms/search?provider_id=vcenter-01',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name_prefix: 'WEB' }) }),
    )
  })

  it('retains previous tag data during name debounce and the next name query', async () => {
    let resolveNameResponse: ((response: Response) => void) | undefined
    const nameResponse = new Promise<Response>((resolve) => { resolveNameResponse = resolve })
    const fetchMock = vi.fn((_: string, init: RequestInit) => parseRequestBody(init)['tag']
      ? Promise.resolve(inventoryResponse(['WEB-01']))
      : nameResponse)
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ prefix, tag }: { prefix: string; tag: string }) => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: prefix, tag, enabled: true }),
      { wrapper: createWrapper(createQueryClient()), initialProps: { prefix: '', tag: 'prod' } },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    rerender({ prefix: 'WEB', tag: '' })

    expect(result.current.isDebouncing).toBe(true)
    expect(result.current.isInitialLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['WEB-01'])
    expect(fetchMock).toHaveBeenCalledOnce()

    await new Promise((resolve) => { setTimeout(resolve, 300) })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(2) })

    expect(result.current.isDebouncing).toBe(false)
    expect(result.current.isBackgroundFetching).toBe(true)
    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['WEB-01'])
    expect(fetchMock).toHaveBeenCalledTimes(2)

    act(() => { resolveNameResponse?.(inventoryResponse(['WEB-02'])) })
  })

  it('does not expose retained empty data as an empty success during debounce or refetch', async () => {
    let resolveNameResponse: ((response: Response) => void) | undefined
    const nameResponse = new Promise<Response>((resolve) => { resolveNameResponse = resolve })
    const fetchMock = vi.fn((_: string, init: RequestInit) => parseRequestBody(init)['tag']
      ? Promise.resolve(inventoryResponse([]))
      : nameResponse)
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ prefix, tag }: { prefix: string; tag: string }) => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: prefix, tag, enabled: true }),
      { wrapper: createWrapper(createQueryClient()), initialProps: { prefix: '', tag: 'prod' } },
    )

    await waitFor(() => { expect(result.current.isEmpty).toBe(true) })
    rerender({ prefix: 'WEB', tag: '' })

    expect(result.current.isDebouncing).toBe(true)
    expect(result.current.data?.virtualMachines).toEqual([])
    expect(result.current.isEmpty).toBe(false)

    await new Promise((resolve) => { setTimeout(resolve, 300) })
    await waitFor(() => { expect(result.current.isBackgroundFetching).toBe(true) })

    expect(result.current.data?.virtualMachines).toEqual([])
    expect(result.current.isEmpty).toBe(false)

    act(() => { resolveNameResponse?.(inventoryResponse(['WEB-01'])) })
  })

  it('suppresses an errored name query while the next name prefix debounces', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient(1)
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: prefix, enabled: true }),
      { wrapper: createWrapper(queryClient), initialProps: { prefix: 'WEB' } },
    )

    await waitFor(() => { expect(result.current.isError).toBe(true) })
    rerender({ prefix: 'WEB2' })

    expect(result.current.isDebouncing).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not restart initial loading after an errored provider query when a new name search starts', async () => {
    let requestCount = 0
    const fetchMock = vi.fn(() => {
      requestCount += 1
      return requestCount < 3
        ? Promise.resolve(new Response(null, { status: 500 }))
        : new Promise<Response>((resolve) => { void resolve })
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient(1)
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: prefix, enabled: true }),
      { wrapper: createWrapper(queryClient), initialProps: { prefix: 'WEB' } },
    )

    await waitFor(() => { expect(result.current.isError).toBe(true) })
    rerender({ prefix: 'WEB2' })

    expect(result.current.isDebouncing).toBe(true)
    await new Promise((resolve) => { setTimeout(resolve, 300) })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(3) })

    expect(result.current.isInitialLoading).toBe(false)
  })

  it('sends tag and name prefix together in the server request and cache key', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01', 'web-02', 'DB-01']))
    vi.stubGlobal('fetch', fetchMock)
    renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: prefix, tag: 'prod', enabled: true }),
      { wrapper: createWrapper(createQueryClient()), initialProps: { prefix: 'WEB' } },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(299) })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vms/search?provider_id=vcenter-01',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ tag: 'prod', name_prefix: 'WEB' }) }),
    )
  })

  it('does not fetch without an enabled provider and refetches only the active tag operation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const disabled = renderHook(
      () => useVmwareResourceInventory({ tag: 'prod', enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )

    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()

    const active = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', namePrefix: 'WEB', tag: 'prod', enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )
    await waitFor(() => { expect(active.result.current.isSuccess).toBe(true) })

    await active.result.current.refetch()

    expect(fetchMock.mock.calls).toEqual(expect.arrayContaining([
      ['/api/vms/search?provider_id=vcenter-01', expect.objectContaining({ method: 'POST', body: JSON.stringify({ tag: 'prod', name_prefix: 'WEB' }) })],
    ]))
    expect(fetchMock.mock.calls.every(([url]) => url === '/api/vms/search?provider_id=vcenter-01')).toBe(true)
  })

  it('force refreshes the settled provider, folder, tag, and name prefix without changing the query key', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(inventoryResponse(['Cached VM']))
      .mockResolvedValueOnce(inventoryResponse(['Refreshed VM']))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useVmwareResourceInventory({
        providerId: 'vcenter-01',
        folderName: 'Applications',
        namePrefix: 'WEB',
        tag: 'prod',
        enabled: true,
      }),
      { wrapper: createWrapper(queryClient) },
    )

    await new Promise((resolve) => { setTimeout(resolve, 300) })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    const queryKey = discoveryInventoryKeys.vmwareSearch({
      providerId: 'vcenter-01',
      folderName: 'Applications',
      namePrefix: 'WEB',
      tag: 'prod',
    })
    await act(async () => { await result.current.forceRefresh() })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/vms/search?provider_id=vcenter-01',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          folder_name: 'Applications',
          tag: 'prod',
          name_prefix: 'WEB',
          force_refresh: true,
        }),
      }),
    )
    await waitFor(() => {
      expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['Refreshed VM'])
    })
    expect(queryClient.getQueryData(queryKey)).toEqual(result.current.data)
    expect(queryClient.getQueryCache().findAll({ queryKey })).toHaveLength(1)
    expect(result.current.forceRefreshError).toBeNull()
  })

  it('keeps cached inventory visible and exposes a force-refresh request failure separately', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(inventoryResponse(['Cached VM']))
      .mockRejectedValueOnce(new Error('live request failed'))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', enabled: true }),
      { wrapper: createWrapper(createQueryClient()) },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('Cached VM') })
    await act(async () => {
      await expect(result.current.forceRefresh()).rejects.toThrow('live request failed')
    })

    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['Cached VM'])
    expect(result.current.isError).toBe(false)
    expect(result.current.isForceRefreshing).toBe(false)
    expect(result.current.forceRefreshError).toMatchObject({ message: 'live request failed' })
  })

  it('keeps concurrent force-refresh pending state with the query key it snapshotted', async () => {
    let resolveFirstForceRefresh: ((response: Response) => void) | undefined
    let resolveSecondForceRefresh: ((response: Response) => void) | undefined
    const firstForceRefreshResponse = new Promise<Response>((resolve) => { resolveFirstForceRefresh = resolve })
    const secondForceRefreshResponse = new Promise<Response>((resolve) => { resolveSecondForceRefresh = resolve })
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (parseRequestBody(init)['force_refresh']) {
        return url.includes('vcenter-01') ? firstForceRefreshResponse : secondForceRefreshResponse
      }
      return Promise.resolve(inventoryResponse([url.includes('vcenter-01') ? 'VCenter-01' : 'VCenter-02']))
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: string }) => useVmwareResourceInventory({ providerId, enabled: true }),
      { wrapper: createWrapper(queryClient), initialProps: { providerId: 'vcenter-01' } },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01') })
    let firstForceRefresh: Promise<unknown> | undefined
    act(() => { firstForceRefresh = result.current.forceRefresh() })
    if (!firstForceRefresh) throw new Error('Expected the first force refresh promise')
    rerender({ providerId: 'vcenter-02' })
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-02') })
    expect(result.current.isForceRefreshing).toBe(false)
    let secondForceRefresh: Promise<unknown> | undefined
    act(() => { secondForceRefresh = result.current.forceRefresh() })
    if (!secondForceRefresh) throw new Error('Expected the second force refresh promise')
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(true) })

    rerender({ providerId: 'vcenter-01' })
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(true) })
    rerender({ providerId: 'vcenter-02' })

    act(() => { resolveFirstForceRefresh?.(inventoryResponse(['VCenter-01 refreshed'])) })
    await act(async () => { await firstForceRefresh })
    await waitFor(() => {
      expect(queryClient.getQueryData(discoveryInventoryKeys.vmwareSearch({ providerId: 'vcenter-01' }))).toMatchObject({
        virtualMachines: [{ name: 'VCenter-01 refreshed' }],
      })
    })

    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['VCenter-02'])
    expect(result.current.forceRefreshError).toBeNull()
    expect(result.current.isForceRefreshing).toBe(true)

    act(() => { resolveSecondForceRefresh?.(inventoryResponse(['VCenter-02 refreshed'])) })
    await act(async () => { await secondForceRefresh })
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(false) })
  })

  it('keeps a rejected force refresh scoped to its original query while another refresh remains pending', async () => {
    let rejectFirstForceRefresh: ((error: Error) => void) | undefined
    let resolveSecondForceRefresh: ((response: Response) => void) | undefined
    const firstForceRefreshResponse = new Promise<Response>((_, reject) => { rejectFirstForceRefresh = reject })
    const secondForceRefreshResponse = new Promise<Response>((resolve) => { resolveSecondForceRefresh = resolve })
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (parseRequestBody(init)['force_refresh']) {
        return url.includes('vcenter-01') ? firstForceRefreshResponse : secondForceRefreshResponse
      }
      return Promise.resolve(inventoryResponse([url.includes('vcenter-01') ? 'VCenter-01' : 'VCenter-02']))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: string }) => useVmwareResourceInventory({ providerId, enabled: true }),
      { wrapper: createWrapper(createQueryClient()), initialProps: { providerId: 'vcenter-01' } },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01') })
    let firstForceRefresh: Promise<unknown> | undefined
    act(() => { firstForceRefresh = result.current.forceRefresh() })
    if (!firstForceRefresh) throw new Error('Expected the first force refresh promise')
    rerender({ providerId: 'vcenter-02' })
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-02') })
    expect(result.current.isForceRefreshing).toBe(false)
    let secondForceRefresh: Promise<unknown> | undefined
    act(() => { secondForceRefresh = result.current.forceRefresh() })
    if (!secondForceRefresh) throw new Error('Expected the second force refresh promise')
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(true) })

    act(() => { rejectFirstForceRefresh?.(new Error('old provider failed')) })
    await act(async () => {
      await expect(firstForceRefresh).rejects.toThrow('old provider failed')
    })

    expect(result.current.forceRefreshError).toBeNull()
    expect(result.current.isError).toBe(false)
    expect(result.current.isForceRefreshing).toBe(true)

    rerender({ providerId: 'vcenter-01' })
    await waitFor(() => {
      expect(result.current.forceRefreshError).toMatchObject({ message: 'old provider failed' })
    })
    expect(result.current.isForceRefreshing).toBe(false)

    rerender({ providerId: 'vcenter-02' })
    expect(result.current.forceRefreshError).toBeNull()
    expect(result.current.isForceRefreshing).toBe(true)

    act(() => { resolveSecondForceRefresh?.(inventoryResponse(['VCenter-02 refreshed'])) })
    await act(async () => { await secondForceRefresh })
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(false) })
  })

  it('returns to fresh cached provider/tag inventory without another request', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(inventoryResponse([
      url.includes('provider_id=vcenter-01') ? 'VCenter-01' : 'VCenter-02',
    ])))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: string }) => useVmwareResourceInventory({ providerId, tag: 'prod', enabled: true }),
      { wrapper: createWrapper(queryClient), initialProps: { providerId: 'vcenter-01' } },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01') })
    rerender({ providerId: 'vcenter-02' })
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-02') })
    rerender({ providerId: 'vcenter-01' })

    expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not present the previous provider inventory while a new provider scope is pending', async () => {
    let resolveSecondResponse: ((response: Response) => void) | undefined
    const secondResponse = new Promise<Response>((resolve) => { resolveSecondResponse = resolve })
    const fetchMock = vi.fn((url: string) => url.includes('vcenter-01')
      ? Promise.resolve(inventoryResponse(['VCenter-01']))
      : secondResponse)
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: string }) => useVmwareResourceInventory({ providerId, tag: 'prod', enabled: true }),
      { wrapper: createWrapper(queryClient), initialProps: { providerId: 'vcenter-01' } },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01') })
    rerender({ providerId: 'vcenter-02' })

    expect(result.current.data).toBeUndefined()
    expect(result.current.isInitialLoading).toBe(true)

    act(() => { resolveSecondResponse?.(inventoryResponse(['VCenter-02'])) })
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-02') })
  })

  it('exposes real HTTP errors after one retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient(1)
    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => { expect(result.current.isError).toBe(true) })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.error?.message).toBe('Discovery inventory request failed with status 500')
  })

  it('distinguishes an empty successful inventory from an initial loading state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(inventoryResponse([])))

    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', enabled: true }),
      { wrapper: createWrapper(createQueryClient()) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.isInitialLoading).toBe(false)
    expect(result.current.isEmpty).toBe(true)
  })
})
