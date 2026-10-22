import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { createAppQueryClient } from '@/shared/query/createAppQueryClient'
import { getDeleteProviderMutationOptions, getSubmitProviderMutationOptions } from '@/generated/query/providers/providers.gen'
import { getSubmitPlatformProviderMutationOptions } from '@/generated/query/platform-providers/platform-providers.gen'
import { getDeleteCredentialMutationOptions, getSubmitCredentialMutationOptions } from '@/generated/query/credentials/credentials.gen'
import { vmwareInventoryQuery } from '../model/inventoryQueries'
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => { resolve = finish })
  return { promise, resolve }
}

const raceClients: QueryClient[] = []
const raceProvider = { id: 'vcenter-01', name: 'VCenter', type: 'VMWARE' as const, role: 'source' as const }
const raceCredential = { id: 'credential-a', name: 'Credential', username: 'test-user', password: 'test-fixture' }

async function setupRefreshRace(providerIds = ['vcenter-01'], client = createAppQueryClient()) {
  raceClients.push(client)
  client.setDefaultOptions({ queries: { ...STANDARD_QUERY_OPTIONS, retry: false } })
  const responses: ReturnType<typeof deferred<Response>>[] = []
  let inventoryName = 'Cached VM'
  let mutationFails = false
  vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
    if (url.includes('/vms/search')) {
      if (!parseRequestBody(init)['force_refresh']) return Promise.resolve(inventoryResponse([inventoryName]))
      const response = deferred<Response>()
      responses.push(response)
      return response.promise
    }
    if (/\/(submit|delete)_(provider|platform_provider|credential)/.test(url)) {
      inventoryName = 'Current VM'
      return Promise.resolve(Response.json(url.includes('credential') ? { credentials: [] } : { providers: [] }, {
        status: mutationFails ? 500 : 200,
      }))
    }
    throw new Error(`Unexpected request: ${url}`)
  }))
  const hooks = providerIds.map(providerId => renderHook(() => useVmwareResourceInventory({ providerId }), {
    wrapper: createWrapper(client),
  }))
  await waitFor(() => {
    hooks.forEach(hook => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Cached VM') })
  })
  return {
    client,
    key: (providerId = 'vcenter-01') => vmwareInventoryQuery({ providerId }).queryKey,
    failMutations: () => { mutationFails = true },
    start: async (hookIndex = 0) => {
      const responseIndex = responses.length
      const hook = hooks[hookIndex]
      if (!hook) throw new Error('Expected a mounted inventory hook')
      let pending!: Promise<unknown>
      act(() => { pending = hook.result.current.forceRefresh() })
      await waitFor(() => { expect(responses).toHaveLength(responseIndex + 1) })
      const response = responses[responseIndex]
      if (!response) throw new Error('Expected a pending live response')
      return {
        finish: async (name: string) => {
          await act(async () => {
            response.resolve(inventoryResponse([name]))
            await pending
          })
        },
      }
    },
  }
}

afterEach(() => {
  raceClients.splice(0).forEach(client => { client.clear() })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useVmwareResourceInventory', () => {
  it('ignores a late refresh after provider update preserves newer refetched inventory', async () => {
    const race = await setupRefreshRace()
    const refresh = await race.start()
    await act(async () => {
      await race.client.getMutationCache().build(race.client, getSubmitProviderMutationOptions(race.client))
        .execute({ data: raceProvider })
    })
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Current VM' }] })

    await refresh.finish('Stale VM')

    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Current VM' }] })
  })

  it.each(['other infra provider', 'platform provider with same ID'])('keeps refresh valid after updating %s', async (scope) => {
    const race = await setupRefreshRace()
    const refresh = await race.start()
    await act(async () => {
      if (scope === 'other infra provider') {
        await race.client.getMutationCache().build(race.client, getSubmitProviderMutationOptions(race.client))
          .execute({ data: { ...raceProvider, id: 'vcenter-02' } })
      } else {
        await race.client.getMutationCache().build(race.client, getSubmitPlatformProviderMutationOptions(race.client))
          .execute({ data: { id: raceProvider.id, name: 'Airflow', type: 'AIRFLOW' } })
      }
    })
    await refresh.finish('Live VM')
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Live VM' }] })
  })

  it('rejects pre-delete results after recreating an ID while accepting a new refresh from another hook', async () => {
    const race = await setupRefreshRace(['vcenter-01', 'vcenter-01'])
    const oldRefresh = await race.start(0)
    await act(async () => {
      await race.client.getMutationCache().build(race.client, getDeleteProviderMutationOptions(race.client))
        .execute({ params: { provider_id: raceProvider.id } })
      await race.client.getMutationCache().build(race.client, getSubmitProviderMutationOptions(race.client))
        .execute({ data: raceProvider })
    })
    const newRefresh = await race.start(1)
    await newRefresh.finish('Recreated VM')
    await oldRefresh.finish('Stale VM')
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Recreated VM' }] })
  })

  it('invalidates pending refreshes from every hook sharing the QueryClient', async () => {
    const race = await setupRefreshRace(['vcenter-01', 'vcenter-01'])
    const first = await race.start(0)
    const second = await race.start(1)
    await act(async () => {
      await race.client.getMutationCache().build(race.client, getDeleteProviderMutationOptions(race.client))
        .execute({ params: { provider_id: raceProvider.id } })
    })
    await first.finish('Stale First')
    await second.finish('Stale Second')
    expect(race.client.getQueryData(race.key())).toBeUndefined()
  })

  it.each(['recreate', 'credential fallback'])('accepts an explicit refresh after a removed result settles (%s)', async (operation) => {
    const race = await setupRefreshRace()
    const oldRefresh = await race.start()
    await act(async () => {
      await race.client.getMutationCache().build(race.client, getDeleteProviderMutationOptions(race.client))
        .execute({ params: { provider_id: raceProvider.id } })
    })
    await oldRefresh.finish('Stale VM')
    expect(race.client.getQueryData(race.key())).toBeUndefined()
    await act(async () => {
      if (operation === 'recreate') {
        await race.client.getMutationCache().build(race.client, getSubmitProviderMutationOptions(race.client))
          .execute({ data: raceProvider })
      } else {
        await race.client.getMutationCache().build(race.client, getSubmitCredentialMutationOptions(race.client))
          .execute({ data: raceCredential })
      }
    })
    const newRefresh = await race.start()
    await newRefresh.finish('New Live VM')
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'New Live VM' }] })
  })

  it('does not invalidate refreshes using another QueryClient with the same provider ID', async () => {
    const race = await setupRefreshRace()
    const other = createAppQueryClient()
    raceClients.push(other)
    const refresh = await race.start()
    await act(async () => {
      await other.getMutationCache().build(other, getDeleteProviderMutationOptions(other))
        .execute({ params: { provider_id: raceProvider.id } })
    })
    await refresh.finish('Live VM')
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Live VM' }] })
  })

  it.each(['provider', 'credential'])('keeps a refresh valid when a %s mutation fails', async (scope) => {
    const race = await setupRefreshRace()
    const refresh = await race.start()
    race.failMutations()
    await act(async () => {
      const pending = scope === 'provider'
        ? race.client.getMutationCache().build(race.client, getSubmitProviderMutationOptions(race.client)).execute({ data: raceProvider })
        : race.client.getMutationCache().build(race.client, getSubmitCredentialMutationOptions(race.client)).execute({ data: raceCredential })
      await expect(pending).rejects.toThrow()
    })
    await refresh.finish('Live VM')
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Live VM' }] })
  })

  it.each(['provider', 'credential'])('rejects stale refresh while %s invalidation is still awaiting cancellation', async (scope) => {
    const race = await setupRefreshRace()
    const refresh = await race.start()
    const cancellation = deferred<undefined>()
    const cancelQueries = race.client.cancelQueries.bind(race.client)
    const entered = deferred<undefined>()
    vi.spyOn(race.client, 'cancelQueries').mockImplementation(async (filters, options) => {
      await cancelQueries(filters, options)
      entered.resolve(undefined)
      await cancellation.promise
    })
    const mutation = scope === 'provider'
      ? race.client.getMutationCache().build(race.client, getSubmitProviderMutationOptions(race.client)).execute({ data: raceProvider })
      : race.client.getMutationCache().build(race.client, getSubmitCredentialMutationOptions(race.client)).execute({ data: raceCredential })
    await entered.promise
    try {
      await refresh.finish('Stale VM')
      expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Cached VM' }] })
    } finally {
      await act(async () => {
        cancellation.resolve(undefined)
        await mutation
      })
    }
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Current VM' }] })
  })

  it.each(['update', 'delete'])('invalidates only related live refreshes after credential %s with complete mapping', async (operation) => {
    const race = await setupRefreshRace(['vcenter-01', 'vcenter-02'])
    race.client.setQueryData(['/get_providers', { role: 'all' }], {
      providers: [{ ...raceProvider, credentialId: raceCredential.id }, { ...raceProvider, id: 'vcenter-02', credentialId: 'other' }],
    })
    const affected = await race.start(0)
    const unrelated = await race.start(1)
    await act(async () => {
      if (operation === 'update') {
        await race.client.getMutationCache().build(race.client, getSubmitCredentialMutationOptions(race.client))
          .execute({ data: raceCredential })
      } else {
        await race.client.getMutationCache().build(race.client, getDeleteCredentialMutationOptions(race.client))
          .execute({ params: { credential_id: raceCredential.id } })
      }
    })
    await affected.finish('Stale VM')
    await unrelated.finish('Live Unrelated VM')
    expect(race.client.getQueryData(race.key())).toMatchObject({ vms: [{ name: 'Current VM' }] })
    expect(race.client.getQueryData(race.key('vcenter-02'))).toMatchObject({ vms: [{ name: 'Live Unrelated VM' }] })
  })

  it.each(['update', 'delete'].flatMap(operation => ['missing', 'filtered', 'stale', 'empty'].map(mapping => ({ operation, mapping }))))('uses credential $operation fallback for $mapping mapping even after the inventory query is removed', async ({ operation, mapping }) => {
    const race = await setupRefreshRace()
    if (mapping !== 'missing') {
      race.client.setQueryData(['/get_providers', { role: mapping === 'filtered' ? 'source' : 'all' }], {
        providers: mapping === 'empty' ? [] : [{ ...raceProvider, credentialId: 'other' }],
      }, mapping === 'stale' ? { updatedAt: Date.now() - 16 * 60 * 1000 } : undefined)
    }
    const refresh = await race.start()
    race.client.removeQueries({ queryKey: race.key(), exact: true })
    await act(async () => {
      if (operation === 'update') {
        await race.client.getMutationCache().build(race.client, getSubmitCredentialMutationOptions(race.client))
          .execute({ data: raceCredential })
      } else {
        await race.client.getMutationCache().build(race.client, getDeleteCredentialMutationOptions(race.client))
          .execute({ params: { credential_id: raceCredential.id } })
      }
    })
    await refresh.finish('Stale VM')
    expect(race.client.getQueryData(race.key())).toBeUndefined()
  })

  it.each(['update', 'delete'])('captures complete credential relationships before list refetch on %s even without an inventory query', async (operation) => {
    const race = await setupRefreshRace()
    const providersKey = ['/get_providers', { role: 'all' }]
    race.client.setQueryData(providersKey, { providers: [{ ...raceProvider, credentialId: raceCredential.id }] })
    const observer = new QueryObserver(race.client, {
      queryKey: providersKey,
      queryFn: () => Promise.resolve({ providers: [] }),
    })
    const unsubscribe = observer.subscribe(() => undefined)
    try {
      const refresh = await race.start()
      race.client.removeQueries({ queryKey: race.key(), exact: true })
      await act(async () => {
        if (operation === 'update') {
          await race.client.getMutationCache().build(race.client, getSubmitCredentialMutationOptions(race.client))
            .execute({ data: raceCredential })
        } else {
          await race.client.getMutationCache().build(race.client, getDeleteCredentialMutationOptions(race.client))
            .execute({ params: { credential_id: raceCredential.id } })
        }
      })
      expect(race.client.getQueryData(providersKey)).toEqual({ providers: [] })
      await refresh.finish('Stale VM')
      expect(race.client.getQueryData(race.key())).toBeUndefined()
    } finally {
      unsubscribe()
    }
  })

  it.each([undefined, '', '   '])('rejects live refresh without a provider (%s) before starting a mutation', async (providerId) => {
    const fetchMock = vi.fn().mockResolvedValue(inventoryResponse(['Unexpected VM']))
    vi.stubGlobal('fetch', fetchMock)
    const client = createAppQueryClient()
    const { result } = renderHook(() => useVmwareResourceInventory(providerId === undefined ? {} : { providerId }), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await expect(result.current.forceRefresh()).rejects.toThrow(/provider/i)
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(client.getQueryData(vmwareInventoryQuery({}).queryKey)).toBeUndefined()
    expect(result.current.isFetching).toBe(false)
    expect(result.current.isForceRefreshing).toBe(false)
    expect(result.current.forceRefreshError).toBeNull()
    client.clear()
  })

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

    const { queryKey } = vmwareInventoryQuery({
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
    // The live result is stored as the wire response under the regular search key.
    expect(queryClient.getQueryData(queryKey)).toMatchObject({ vms: [{ name: 'Refreshed VM' }] })
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

  it('does not restore deleted-provider inventory from a late force-refresh mutation', async () => {
    let resolveLiveRefresh: ((response: Response) => void) | undefined
    const liveRefreshResponse = new Promise<Response>((resolve) => { resolveLiveRefresh = resolve })
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (url.includes('/vms/search')) {
        return parseRequestBody(init)['force_refresh']
          ? liveRefreshResponse
          : Promise.resolve(inventoryResponse(['Cached VM']))
      }
      if (url.includes('/delete_provider')) return Promise.resolve(Response.json({ providers: [] }))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createAppQueryClient()
    queryClient.setDefaultOptions({ queries: { ...STANDARD_QUERY_OPTIONS, retry: false } })
    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )
    const key = vmwareInventoryQuery({ providerId: 'vcenter-01' }).queryKey
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('Cached VM') })

    let pendingRefresh: Promise<unknown> | undefined
    act(() => { pendingRefresh = result.current.forceRefresh() })
    if (!pendingRefresh) throw new Error('Expected pending live refresh')
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(true) })

    await act(async () => {
      await queryClient.getMutationCache().build(queryClient, getDeleteProviderMutationOptions(queryClient))
        .execute({ params: { provider_id: 'vcenter-01' } })
    })
    expect(queryClient.getQueryData(key)).toBeUndefined()

    act(() => { resolveLiveRefresh?.(inventoryResponse(['Stale VM'])) })
    await act(async () => { await pendingRefresh })

    // A mutation started before provider deletion must not resurrect its cached inventory.
    expect(queryClient.getQueryData(key)).toBeUndefined()
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
      expect(queryClient.getQueryData(vmwareInventoryQuery({ providerId: 'vcenter-01' }).queryKey)).toMatchObject({
        vms: [{ name: 'VCenter-01 refreshed' }],
      })
    })

    expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['VCenter-02'])
    expect(result.current.forceRefreshError).toBeNull()
    expect(result.current.isForceRefreshing).toBe(true)

    act(() => { resolveSecondForceRefresh?.(inventoryResponse(['VCenter-02 refreshed'])) })
    await act(async () => { await secondForceRefresh })
    await waitFor(() => { expect(result.current.isForceRefreshing).toBe(false) })
  })

  it('keeps the newest same-key force refresh in the inventory cache when responses settle out of order', async () => {
    let resolveFirstForceRefresh: ((response: Response) => void) | undefined
    let resolveSecondForceRefresh: ((response: Response) => void) | undefined
    const firstForceRefreshResponse = new Promise<Response>((resolve) => { resolveFirstForceRefresh = resolve })
    const secondForceRefreshResponse = new Promise<Response>((resolve) => { resolveSecondForceRefresh = resolve })
    let forceRefreshCount = 0
    const fetchMock = vi.fn((_: string, init: RequestInit) => {
      if (!parseRequestBody(init)['force_refresh']) return Promise.resolve(inventoryResponse(['Cached VM']))
      forceRefreshCount += 1
      return forceRefreshCount === 1 ? firstForceRefreshResponse : secondForceRefreshResponse
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(
      () => useVmwareResourceInventory({ providerId: 'vcenter-01', enabled: true }),
      { wrapper: createWrapper(createQueryClient()) },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('Cached VM') })
    let firstForceRefresh: Promise<unknown> | undefined
    let secondForceRefresh: Promise<unknown> | undefined
    act(() => { firstForceRefresh = result.current.forceRefresh() })
    act(() => { secondForceRefresh = result.current.forceRefresh() })
    if (!firstForceRefresh || !secondForceRefresh) throw new Error('Expected both force refresh promises')

    act(() => { resolveSecondForceRefresh?.(inventoryResponse(['Newer VM'])) })
    await act(async () => { await secondForceRefresh })
    act(() => { resolveFirstForceRefresh?.(inventoryResponse(['Older VM'])) })
    await act(async () => { await firstForceRefresh })

    await waitFor(() => {
      expect(result.current.data?.virtualMachines.map((vm) => vm.name)).toEqual(['Newer VM'])
    })
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

  it('switches provider filters immediately and returns to cached provider data', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(inventoryResponse([
      url.includes('provider_id=vm-01') ? 'VM 01' : 'VM 03',
    ])))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ providerId, namePrefix, tag }: { providerId: string; namePrefix: string; tag: string }) => (
        useVmwareResourceInventory({ providerId, namePrefix, tag, enabled: true })
      ),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { providerId: 'vm-01', namePrefix: 'TEST-', tag: 'WEB' },
      },
    )

    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VM 01') })

    rerender({ providerId: 'vm-03', namePrefix: '', tag: '' })

    expect(result.current.data).toBeUndefined()
    expect(result.current.isInitialLoading).toBe(true)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/vms/search?provider_id=vm-03',
        expect.objectContaining({ method: 'POST', body: '{}' }),
      )
    })
    await waitFor(() => { expect(result.current.data?.virtualMachines[0]?.name).toBe('VM 03') })

    const requestCountBeforeCachedReturn = fetchMock.mock.calls.length
    rerender({ providerId: 'vm-01', namePrefix: 'TEST-', tag: 'WEB' })

    expect(result.current.data?.virtualMachines[0]?.name).toBe('VM 01')
    expect(fetchMock).toHaveBeenCalledTimes(requestCountBeforeCachedReturn)
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
    expect(result.current.error).toMatchObject({ name: 'OrvalApiError', status: 500 })
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
