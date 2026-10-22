import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDeleteProviderMutationOptions, getSubmitProviderMutationOptions } from '@/generated/query/providers/providers.gen'
import { getSubmitCredentialMutationOptions } from '@/generated/query/credentials/credentials.gen'
import { createAppQueryClient } from '@/shared/query/createAppQueryClient'
import { isProviderInventoryDeleted } from '@/shared/query/providerInventoryRevision'
import { vmwareInventoryQuery } from '../model/inventoryQueries'
import { useVmwareResourceInventory } from './useVmwareResourceInventory'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(finish => { resolve = finish })
  return { promise, resolve }
}

const clients: QueryClient[] = []
const provider = { id: 'a', name: 'A', type: 'VMWARE' as const, role: 'source' as const }
const options = vmwareInventoryQuery({ providerId: provider.id })
const response = (name: string) => Response.json({ count: 1, vms: [{ name }] })

function setup(retry = 0) {
  const client = createAppQueryClient()
  clients.push(client)
  client.setDefaultOptions({ queries: { staleTime: 900_000, retry, retryDelay: 0 } })
  let inventory = () => Promise.resolve(response('Old VM'))
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/vms/search')) {
      requests.push(url)
      return inventory()
    }
    if (url.includes('/get_providers')) return Promise.resolve(Response.json({ providers: [] }))
    if (url.includes('/get_platform_providers')) return Promise.resolve(Response.json({ providers: [] }))
    if (/\/(submit|delete)_/.test(url)) return Promise.resolve(Response.json(url.includes('credential') ? { credentials: [] } : { providers: [] }))
    throw new Error(`Unexpected request: ${url}`)
  }))
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return {
    client, requests, Wrapper,
    setInventory: (next: () => Promise<Response>) => { inventory = next },
    remove: () => client.getMutationCache().build(client, getDeleteProviderMutationOptions(client)).execute({ params: { provider_id: provider.id } }),
    submit: () => client.getMutationCache().build(client, getSubmitProviderMutationOptions(client)).execute({ data: provider }),
    credential: () => client.getMutationCache().build(client, getSubmitCredentialMutationOptions(client)).execute({ data: { id: 'cred', name: 'Credential', username: 'user', password: 'fixture' } }),
  }
}

afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => { client.clear() })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('VMware inventory lifecycle through real query callers', () => {
  it.each([0, 1])('blocks refetch, fetchQuery and prefetch after delete with retry=%i', async retry => {
    const env = setup(retry)
    const hook = renderHook(() => useVmwareResourceInventory({ providerId: 'a' }), { wrapper: env.Wrapper })
    await waitFor(() => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Old VM') })
    const oldRefetch = hook.result.current.refetch
    await act(async () => { await env.remove() })
    await act(async () => {
      const result = await oldRefetch()
      expect(result.isSuccess).toBe(false)
      expect(result.data).toBeUndefined()
      await expect(oldRefetch({ throwOnError: true })).rejects.toThrow()
      await expect(env.client.fetchQuery(options)).rejects.toThrow()
      await expect(env.client.prefetchQuery(options)).resolves.toBeUndefined()
    })
    expect(env.requests).toHaveLength(1)
    expect(env.client.getQueryData(options.queryKey)).toBeUndefined()
    expect(hook.result.current.data).toBeUndefined()
  })

  it('evicts fresh data before an asynchronous delete cancellation can expose a cache hit', async () => {
    const env = setup()
    await env.client.fetchQuery(options)
    const entered = deferred<undefined>()
    const release = deferred<undefined>()
    const cancel = env.client.cancelQueries.bind(env.client)
    vi.spyOn(env.client, 'cancelQueries').mockImplementation(async (filters, config) => {
      await cancel(filters, config)
      entered.resolve(undefined)
      await release.promise
    })
    const removing = env.remove()
    await entered.promise
    expect(isProviderInventoryDeleted(env.client, 'a')).toBe(true)
    const fetched = await env.client.fetchQuery(options).catch((error: unknown) => error)
    await expect(env.client.prefetchQuery(options)).resolves.toBeUndefined()
    release.resolve(undefined)
    await removing
    expect(fetched).toBeInstanceOf(Error)
    expect(env.requests).toHaveLength(1)
    expect(env.client.getQueryData(options.queryKey)).toBeUndefined()
  })

  it('removes the retained same-provider placeholder while the hook remains mounted', async () => {
    const env = setup()
    const hook = renderHook(({ tag }: { tag?: string }) => useVmwareResourceInventory({ providerId: 'a', ...(tag ? { tag } : {}) }), { wrapper: env.Wrapper, initialProps: {} })
    await waitFor(() => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Old VM') })
    const pending = deferred<Response>()
    env.setInventory(() => pending.promise)
    hook.rerender({ tag: 'prod' })
    await waitFor(() => { expect(hook.result.current.isPlaceholderData).toBe(true) })
    await act(async () => { await env.remove() })
    expect(hook.result.current).toMatchObject({ data: undefined, isSuccess: false, isEmpty: false, isInitialLoading: false, isPlaceholderData: false, status: 'pending', fetchStatus: 'idle' })
    env.setInventory(() => Promise.resolve(response('Current VM')))
    await act(async () => { await env.submit() })
    await waitFor(() => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Current VM') })
    await act(async () => { pending.resolve(response('Stale VM')); await pending.promise })
    expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Current VM')
  })

  it.each(['delete', 'recreate', 'provider update', 'credential update'] as const)('rejects a late ordinary HTTP response after %s even when transport ignores abort', async operation => {
    const env = setup()
    const pending = deferred<Response>()
    env.setInventory(() => pending.promise)
    const writes: string[] = []
    const unsubscribe = env.client.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'success') {
        const data = env.client.getQueryData<{ vms: { name: string }[] }>(options.queryKey)
        writes.push(...(data?.vms.map(vm => vm.name) ?? []))
      }
    })
    // No observer: cancellation must protect even a fetchQuery initiated by prefetch callers.
    const request = env.client.fetchQuery(options).catch((error: unknown) => error)
    await waitFor(() => { expect(env.requests).toHaveLength(1) })
    if (operation === 'delete' || operation === 'recreate') await env.remove()
    if (operation === 'recreate' || operation === 'provider update') await env.submit()
    if (operation === 'credential update') await env.credential()
    pending.resolve(response('Stale VM'))
    await request
    expect(writes).not.toContain('Stale VM')
    expect(env.client.getQueryData(options.queryKey)).toBeUndefined()
    unsubscribe()
  })

  it.each(['submit', 'credential'] as const)('automatically replaces a pending first fetch after %s without remount', async operation => {
    const env = setup()
    const pending = deferred<Response>()
    env.setInventory(() => pending.promise)
    const hook = renderHook(() => useVmwareResourceInventory({ providerId: 'a' }), { wrapper: env.Wrapper })
    await waitFor(() => { expect(env.requests).toHaveLength(1) })
    env.setInventory(() => Promise.resolve(response('Current VM')))
    await act(async () => { await env[operation]() })
    await act(async () => { pending.resolve(response('Stale VM')); await pending.promise })
    await waitFor(() => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Current VM') })
    expect(isProviderInventoryDeleted(env.client, 'a')).toBe(false)
    expect(env.requests).toHaveLength(2)
  })

  it.each(['submit', 'credential'] as const)('rejects an uncancelled old queryFn result after %s', async operation => {
    const env = setup()
    const pending = deferred<Response>()
    env.setInventory(() => pending.promise)
    const request = options.queryFn({ client: env.client, signal: new AbortController().signal }).catch((error: unknown) => error)
    await env[operation]()
    pending.resolve(response('Stale VM'))
    expect(await request).toBeInstanceOf(Error)
  })

  it('rejects an uncancelled previous lifecycle response after delete and recreate', async () => {
    const env = setup()
    const pending = deferred<Response>()
    env.setInventory(() => pending.promise)
    const request = options.queryFn({ client: env.client, signal: new AbortController().signal }).catch((error: unknown) => error)
    await env.remove()
    await env.submit()
    expect(isProviderInventoryDeleted(env.client, 'a')).toBe(false)
    pending.resolve(response('Stale VM'))
    expect(await request).toBeInstanceOf(Error)
    expect(env.client.getQueryData(options.queryKey)).toBeUndefined()
  })

  it.each([0, 1])('restores automatic/refetch/prefetch/live loading after recreate with retry=%i and isolates clients/providers', async retry => {
    const env = setup(retry)
    const hook = renderHook(() => useVmwareResourceInventory({ providerId: 'a' }), { wrapper: env.Wrapper })
    await waitFor(() => { expect(hook.result.current.isSuccess).toBe(true) })
    await act(async () => { await env.remove() })
    const otherClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    clients.push(otherClient)
    await expect(otherClient.fetchQuery(options)).resolves.toMatchObject({ vms: [{ name: 'Old VM' }] })
    await expect(env.client.fetchQuery(vmwareInventoryQuery({ providerId: 'b' }))).resolves.toMatchObject({ vms: [{ name: 'Old VM' }] })
    env.setInventory(() => Promise.resolve(response('Current VM')))
    await act(async () => { await env.submit() })
    await waitFor(() => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Current VM') })
    await act(async () => {
      await expect(hook.result.current.refetch({ throwOnError: true })).resolves.toMatchObject({ isSuccess: true })
      await hook.result.current.forceRefresh()
      await env.client.prefetchQuery({ ...options, staleTime: 0 })
    })
    expect(env.client.getQueryData(options.queryKey)).toMatchObject({ vms: [{ name: 'Current VM' }] })
    expect(env.requests).toHaveLength(7)
  })

  it.each([
    ['submit', 'focus', 0], ['submit', 'reconnect', 1],
    ['credential', 'focus', 1], ['credential', 'reconnect', 0],
  ] as const)('recovers a failed automatic fetch after pending %s through %s (retry %i)', async (operation, event, retry) => {
    const env = setup(retry)
    const pending = deferred<Response>()
    env.setInventory(() => pending.promise)
    const hook = renderHook(() => useVmwareResourceInventory({ providerId: 'a' }), { wrapper: env.Wrapper })
    await waitFor(() => { expect(env.requests).toHaveLength(1) })
    env.setInventory(() => Promise.resolve(Response.json({ detail: 'offline' }, { status: 500 })))
    await act(async () => { await env[operation]() })
    await act(async () => { pending.resolve(response('Stale VM')); await pending.promise })
    await waitFor(() => { expect(hook.result.current.isError).toBe(true) })
    expect(env.requests).toHaveLength(2 + retry)
    env.setInventory(() => Promise.resolve(response('Current VM')))
    act(() => {
      if (event === 'focus') { focusManager.setFocused(false); focusManager.setFocused(true) }
      else { onlineManager.setOnline(false); onlineManager.setOnline(true) }
    })
    await waitFor(() => { expect(hook.result.current.data?.virtualMachines[0]?.name).toBe('Current VM') })
    expect(env.requests).toHaveLength(3 + retry)
    focusManager.setFocused(undefined)
  })
})
