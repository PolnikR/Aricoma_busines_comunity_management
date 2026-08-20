import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { useVmwareResourceInventory } from './useVmwareResourceInventory'

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function inventoryResponse(names: string[]) {
  return new Response(JSON.stringify({
    count: names.length,
    vms: names.map((name) => ({ name })),
  }), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useVmwareResourceInventory', () => {
  it.each([
    { namePrefix: '', tag: '', expectedUrl: '/api/vms?provider_id=vcenter-01' },
    { namePrefix: '', tag: 'prod', expectedUrl: '/api/vms_by_tag?tag=prod&provider_id=vcenter-01' },
  ])('uses the matching remote endpoint for $namePrefix/$tag filters', async ({ namePrefix, tag, expectedUrl }) => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useVmwareResourceInventory('vcenter-01', namePrefix, tag, true),
      { wrapper: createWrapper(createQueryClient()) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
  })

  it('waits 300 ms before requesting a name-only prefix and normalizes its result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useVmwareResourceInventory('vcenter-01', 'WEB', '', true),
      { wrapper: createWrapper(createQueryClient()) },
    )

    expect(fetchMock).not.toHaveBeenCalled()

    await new Promise((resolve) => { setTimeout(resolve, 250) })
    expect(fetchMock).not.toHaveBeenCalled()

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vms_by_name?prefix=WEB&provider_id=vcenter-01',
      expect.any(Object),
    )
    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['WEB-01'])
  })

  it('replaces name-only debounce input with one settled request', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory('vcenter-01', prefix, '', true),
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
      '/api/vms_by_name?prefix=WEB&provider_id=vcenter-01',
      expect.any(Object),
    )
  })

  it('retains previous tag data during name debounce and the next name query', async () => {
    let resolveNameResponse: ((response: Response) => void) | undefined
    const nameResponse = new Promise<Response>((resolve) => { resolveNameResponse = resolve })
    const fetchMock = vi.fn((url: string) => url.includes('/vms_by_tag')
      ? Promise.resolve(inventoryResponse(['WEB-01']))
      : nameResponse)
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ prefix, tag }: { prefix: string; tag: string }) => useVmwareResourceInventory('vcenter-01', prefix, tag, true),
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
    const fetchMock = vi.fn((url: string) => url.includes('/vms_by_tag')
      ? Promise.resolve(inventoryResponse([]))
      : nameResponse)
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ prefix, tag }: { prefix: string; tag: string }) => useVmwareResourceInventory('vcenter-01', prefix, tag, true),
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
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 1 } },
    })
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory('vcenter-01', prefix, '', true),
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
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 1 } },
    })
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory('vcenter-01', prefix, '', true),
      { wrapper: createWrapper(queryClient), initialProps: { prefix: 'WEB' } },
    )

    await waitFor(() => { expect(result.current.isError).toBe(true) })
    rerender({ prefix: 'WEB2' })

    expect(result.current.isDebouncing).toBe(true)
    await new Promise((resolve) => { setTimeout(resolve, 300) })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(3) })

    expect(result.current.isInitialLoading).toBe(false)
  })

  it('filters tag inventory by a case-sensitive name prefix without adding the prefix to the cache key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01', 'web-02', 'DB-01']))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useVmwareResourceInventory('vcenter-01', prefix, 'prod', true),
      { wrapper: createWrapper(queryClient), initialProps: { prefix: 'WEB' } },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['WEB-01'])

    rerender({ prefix: 'DB' })

    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['DB-01'])
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(discoveryInventoryKeys.inventory('vcenter-01', 'prod')))
      .toMatchObject({ virtualMachines: [{ name: 'WEB-01' }, { name: 'web-02' }, { name: 'DB-01' }] })
  })

  it('does not fetch without an enabled provider and refetches only the active tag operation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['WEB-01']))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const disabled = renderHook(
      () => useVmwareResourceInventory(undefined, '', 'prod', true),
      { wrapper: createWrapper(queryClient) },
    )

    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()

    const active = renderHook(
      () => useVmwareResourceInventory('vcenter-01', 'WEB', 'prod', true),
      { wrapper: createWrapper(queryClient) },
    )
    await waitFor(() => { expect(active.result.current.isSuccess).toBe(true) })

    await active.result.current.refetch()

    expect(fetchMock.mock.calls).toEqual(expect.arrayContaining([
      ['/api/vms_by_tag?tag=prod&provider_id=vcenter-01', expect.any(Object)],
    ]))
    expect(fetchMock.mock.calls.every(([url]) => url === '/api/vms_by_tag?tag=prod&provider_id=vcenter-01')).toBe(true)
  })

  it('returns to fresh cached provider/tag inventory without another request', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(inventoryResponse([
      url.includes('provider_id=vcenter-01') ? 'VCenter-01' : 'VCenter-02',
    ])))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: string }) => useVmwareResourceInventory(providerId, '', 'prod', true),
      { wrapper: createWrapper(queryClient), initialProps: { providerId: 'vcenter-01' } },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01') })
    rerender({ providerId: 'vcenter-02' })
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-02') })
    rerender({ providerId: 'vcenter-01' })

    expect(result.current.data?.virtualMachines[0]?.name).toBe('VCenter-01')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('exposes real HTTP errors after one retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 1 } },
    })
    const { result } = renderHook(
      () => useVmwareResourceInventory('vcenter-01', '', '', true),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => { expect(result.current.isError).toBe(true) })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.error?.message).toBe('Discovery inventory request failed with status 500')
  })

  it('distinguishes an empty successful inventory from an initial loading state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(inventoryResponse([])))

    const { result } = renderHook(
      () => useVmwareResourceInventory('vcenter-01', '', '', true),
      { wrapper: createWrapper(createQueryClient()) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.isInitialLoading).toBe(false)
    expect(result.current.isEmpty).toBe(true)
  })
})
