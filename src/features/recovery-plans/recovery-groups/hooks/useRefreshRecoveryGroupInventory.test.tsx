import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGetRecoveryGroupInventoryQueryOptions } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { useRefreshRecoveryGroupInventory } from './useRefreshRecoveryGroupInventory'

function inventory(run = 'A', name = 'cached') {
  return { recovery_group_id: 'group', recovery_group_name: name, run_id: run, volumes: {} }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

const clients: QueryClient[] = []
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  const key = getGetRecoveryGroupInventoryQueryOptions({ run_id: 'A' }).queryKey
  client.setQueryData(key, inventory())
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(({ run }) => useRefreshRecoveryGroupInventory(run), { initialProps: { run: 'A' }, wrapper })
  return { client, key, ...hook }
}

afterEach(() => {
  clients.splice(0).forEach(client => { client.clear() })
  vi.unstubAllGlobals()
})

describe('live inventory request ownership', () => {
  it('does not revive a settled error when returning to a previously viewed run', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { result, rerender } = setup()
    await act(async () => { await result.current.refresh() })
    expect(result.current.error).toBeInstanceOf(Error)
    rerender({ run: 'B' })
    expect(result.current.error).toBeNull()
    rerender({ run: 'A' })
    expect(result.current.error).toBeNull()
  })

  it.each(['snapshot', 'missing', 'failure'])('marks only snapshot-provider storage queries stale after %s', async mode => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(mode === 'failure'
      ? Response.json({ detail: 'Unavailable' }, { status: 503 })
      : Response.json({ ...inventory(), provider_id_volume: 'master', snapshot_provider_id: mode === 'snapshot' ? 'aux' : null }))
    vi.stubGlobal('fetch', fetchMock)
    const { result, client } = setup()
    const keys = [
      ['/get_volumes', { provider_id: 'aux' }],
      ['/get_volume_tree', { provider_id: 'aux', view: 'flat' }],
      ['/get_volume_tree', { provider_id: 'aux', view: 'pool', force_refresh: false }],
      ['/get_volumes', { provider_id: 'master' }],
      ['/get_volumes', { provider_id: 'other' }],
      ['/get_volumes'],
      ['/get_vdisks_by_vm', { provider_id: 'aux', vm_name: 'vm' }],
    ]
    keys.forEach(key => { client.setQueryData(key, {}) })
    await act(async () => { await result.current.refresh() })
    expect(keys.map(key => client.getQueryState(key)?.isInvalidated)).toEqual([
      ...Array<boolean>(3).fill(mode === 'snapshot'), false, false, false, false,
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('locks synchronously, stores raw data under only the ordinary key, then refetches normally', async () => {
    const response = deferred<Response>()
    const fetchMock = vi.fn<typeof fetch>().mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(Response.json(inventory('A', 'ordinary')))
    vi.stubGlobal('fetch', fetchMock)
    const { result, client, key } = setup()
    let pending!: Promise<void>
    act(() => { pending = result.current.refresh(); void result.current.refresh() })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    expect(result.current.isRefreshing).toBe(true)
    const wire = inventory('A', 'live')
    await act(async () => { response.resolve(Response.json(wire)); await pending })
    expect(client.getQueryData(key)).toEqual(wire)
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([key])
    expect(result.current.isRefreshing).toBe(false)
    await client.fetchQuery(getGetRecoveryGroupInventoryQueryOptions({ run_id: 'A' }))
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/get_recovery_group_inventory?run_id=A&force_refresh=true',
      '/api/get_recovery_group_inventory?run_id=A',
    ])
  })

  it.each(['B', 'A-again', 'unmount', 'remove', 'replace', 'invalidate'])('discards a late signal-ignoring response after %s', async change => {
    const response = deferred<Response>()
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(response.promise)
    vi.stubGlobal('fetch', fetchMock)
    const { result, rerender, unmount, client, key } = setup()
    let pending!: Promise<void>
    act(() => { pending = result.current.refresh() })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledOnce() })
    act(() => {
      if (change === 'B' || change === 'A-again') rerender({ run: 'B' })
      if (change === 'unmount') unmount()
      if (change === 'remove' || change === 'replace') client.removeQueries({ queryKey: key, exact: true })
      if (change === 'replace') client.setQueryData(key, inventory('A', 'replacement'))
      if (change === 'invalidate') void client.invalidateQueries({ queryKey: key, refetchType: 'none' })
    })
    if (change === 'A-again') rerender({ run: 'A' })
    await act(async () => { response.resolve(Response.json(inventory('A', 'obsolete'))); await pending })
    expect(client.getQueryData(key)).toEqual(change === 'remove' ? undefined : inventory('A', change === 'replace' ? 'replacement' : 'cached'))
    if (change !== 'unmount') {
      expect(result.current.error).toBeNull()
      expect(result.current.isRefreshing).toBe(false)
    }
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  })

  it.each(['http', 'network', 'contract', 'wrong-run'])('keeps cached data on %s failure without retrying', async failure => {
    const fetchMock = vi.fn<typeof fetch>()
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline'))
    else fetchMock.mockResolvedValue(failure === 'http'
      ? Response.json({ detail: 'Unavailable' }, { status: 503 })
      : Response.json(failure === 'contract' ? { invalid: true } : inventory('B')))
    vi.stubGlobal('fetch', fetchMock)
    const { result, client, key } = setup()
    await act(async () => { await result.current.refresh() })
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.isRefreshing).toBe(false)
    expect(client.getQueryData(key)).toEqual(inventory())
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([[true, true], [true, false], [false, true], [false, false]])('keeps the live result (ordinary starts before=%s, settles first=%s)', async (before, settlesFirst) => {
    const ordinary = deferred<Response>()
    const live = deferred<Response>()
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(url => typeof url === 'string' && url.includes('force_refresh') ? live.promise : ordinary.promise)
    vi.stubGlobal('fetch', fetchMock)
    const { result, client, key } = setup()
    const normal = () => client.fetchQuery(getGetRecoveryGroupInventoryQueryOptions({ run_id: 'A' })).catch(() => undefined)
    let normalPending: Promise<unknown> | undefined
    if (before) normalPending = normal()
    let pending!: Promise<void>
    act(() => { pending = result.current.refresh() })
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(before ? 2 : 1) })
    if (!before) normalPending = normal()
    if (settlesFirst) await act(async () => { ordinary.resolve(Response.json(inventory('A', 'stale'))); await normalPending })
    await act(async () => { live.resolve(Response.json(inventory('A', 'live'))); await pending })
    if (!settlesFirst) await act(async () => { ordinary.resolve(Response.json(inventory('A', 'stale'))); await normalPending })
    expect(client.getQueryData(key)).toEqual(inventory('A', 'live'))
  })
})
