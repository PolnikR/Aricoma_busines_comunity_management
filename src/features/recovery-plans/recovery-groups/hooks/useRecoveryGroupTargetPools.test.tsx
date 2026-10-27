import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { VolumesResponse } from '@/generated/query/zod'
import { flashSystemInventoryQuery } from '@/features/discovery-inventory/resources/model/inventoryQueries'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { useRecoveryGroupTargetPools } from './useRecoveryGroupTargetPools'

const clients: QueryClient[] = []
afterEach(() => { clients.splice(0).forEach(client => { client.clear() }); vi.unstubAllGlobals() })
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  clients.push(client)
  return { client, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }
}
const response = (name = 'Pool name') => VolumesResponse.parse({ count: 0, volumes: [], pools: { '42': { name, free_capacity: '10TB' } } })

it('reuses a fresh target wire cache without another request and exposes names rather than IDs', () => {
  const { client, wrapper } = setup()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  client.setQueryData(flashSystemInventoryQuery('target').queryKey, response())
  const { result } = renderHook(() => useRecoveryGroupTargetPools('target', true), { wrapper })
  expect(result.current.data).toEqual([{ name: 'Pool name', freeCapacity: '10TB' }])
  expect(fetch).not.toHaveBeenCalled()
})

it('does not use the default array when no target exists or the flow is inactive', () => {
  const { client, wrapper } = setup()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  client.setQueryData(flashSystemInventoryQuery().queryKey, response('Wrong default array'))
  const { result } = renderHook(() => useRecoveryGroupTargetPools(undefined, true), { wrapper })
  renderHook(() => useRecoveryGroupTargetPools('target', false), { wrapper })
  expect(fetch).not.toHaveBeenCalled()
  expect(result.current.data).toBeUndefined()
})

it('never fetches the default array when retry is called without a target', async () => {
  const { wrapper } = setup()
  const fetch = vi.fn(() => Promise.resolve(Response.json(response('Wrong default array'))))
  vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useRecoveryGroupTargetPools(undefined, true), { wrapper })
  await act(async () => { await result.current.refetch() })
  expect(fetch).not.toHaveBeenCalled()
  expect(result.current.data).toBeUndefined()
})

it('deduplicates concurrent observers and treats an empty pool map as successful inventory', async () => {
  const { wrapper } = setup()
  let finish!: (response: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetch)
  const first = renderHook(() => useRecoveryGroupTargetPools('target', true), { wrapper })
  const second = renderHook(() => useRecoveryGroupTargetPools('target', true), { wrapper })
  await waitFor(() => { expect(fetch).toHaveBeenCalledTimes(1) })
  act(() => { finish(Response.json({ count: 0, volumes: [], pools: {} })) })
  await waitFor(() => { expect(first.result.current.data).toEqual([]); expect(second.result.current.isSuccess).toBe(true) })
  expect(fetch).toHaveBeenCalledTimes(1)
})

it.each(['stale', 'invalidated'] as const)('refreshes %s cached inventory under the same target key', async state => {
  const { client, wrapper } = setup()
  const key = flashSystemInventoryQuery('target').queryKey
  client.setQueryData(key, response('Old'), { updatedAt: state === 'stale' ? Date.now() - 16 * 60 * 1000 : Date.now() })
  if (state === 'invalidated') await client.invalidateQueries({ queryKey: key })
  const fetch = vi.fn(() => Promise.resolve(Response.json(response('Fresh'))))
  vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useRecoveryGroupTargetPools('target', true), { wrapper })
  await waitFor(() => { expect(result.current.data?.[0]?.name).toBe('Fresh') })
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('switches target keys without showing previous pool data', async () => {
  const { client, wrapper } = setup()
  client.setQueryData(flashSystemInventoryQuery('a').queryKey, response('A'))
  let finish!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
  const { result, rerender } = renderHook(({ id }) => useRecoveryGroupTargetPools(id, true), { wrapper, initialProps: { id: 'a' } })
  expect(result.current.data?.[0]?.name).toBe('A')
  rerender({ id: 'b' })
  expect(result.current.data).toBeUndefined()
  await waitFor(() => { expect(finish).toBeTypeOf('function') })
  act(() => { finish(Response.json(response('B'))) })
  await waitFor(() => { expect(result.current.data?.[0]?.name).toBe('B') })
})

it('distinguishes inventory errors and retries under the normal target key', async () => {
  const { wrapper } = setup()
  let fail = true
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fail ? Response.json({ detail: 'Forbidden' }, { status: 403 }) : Response.json(response()))))
  const { result } = renderHook(() => useRecoveryGroupTargetPools('target', true), { wrapper })
  await waitFor(() => { expect(result.current.isError).toBe(true) })
  expect(result.current.data).toBeUndefined()
  fail = false
  await act(async () => { await result.current.refetch() })
  await waitFor(() => { expect(result.current.data?.[0]?.name).toBe('Pool name') })
})
