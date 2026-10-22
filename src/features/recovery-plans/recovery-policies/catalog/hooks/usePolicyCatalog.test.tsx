import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { getGetPoliciesQueryKey } from '@/generated/query/snapshot-policies/snapshot-policies.gen'
import { usePolicyCatalog } from './usePolicyCatalog'

const cadence = { frequency_value: 1, frequency_unit: 'days', retention_value: 1, retention_unit: 'days' }
const responses: Record<string, object> = {
  '/api/get_policies': { snapshot_policies: [{ id: 'snap', name: 'Snapshot', ...cadence }] },
  '/api/get_recovery_app_policies': { recovery_app_policies: [{ id: 'recover', name: 'Recovery', ...cadence }] },
  '/api/get_clean_room_policies': { clean_room_policies: [{ id: 'clean', name: 'Clean room' }] },
}
afterEach(() => { vi.unstubAllGlobals() })

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

it('connects all three generated lists and shares concurrent observers', async () => {
  const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(responses[url]), { status: 200 })))
  vi.stubGlobal('fetch', fetchMock)
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => [usePolicyCatalog(), usePolicyCatalog()] as const, { wrapper })
  await waitFor(() => { expect(result.current[0].sources.cleanRoom.status).toBe('ready') })
  expect(result.current[0].resolve('snapshot', 'snap')).toMatchObject({ policy: { name: 'Snapshot' } })
  expect(result.current[0].resolve('recoveryApp', 'recover')).toMatchObject({ policy: { name: 'Recovery' } })
  expect(result.current[1].resolve('cleanRoom', 'clean')).toMatchObject({ policy: { name: 'Clean room' } })
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(client.getQueryCache().getAll()).toHaveLength(3)
  unmount()
  client.clear()
})

it('keeps cached data after refresh failure and retries only the affected endpoint', async () => {
  let failSnapshot = false
  const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(responses[url]), {
    status: failSnapshot && url === '/api/get_policies' ? 503 : 200,
  })))
  vi.stubGlobal('fetch', fetchMock)
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => usePolicyCatalog(), { wrapper })
  await waitFor(() => { expect(result.current.sources.snapshot.status).toBe('ready') })
  const cached = result.current.sources.snapshot.items
  failSnapshot = true
  await act(async () => { await client.invalidateQueries({ queryKey: getGetPoliciesQueryKey() }) })
  await waitFor(() => { expect(result.current.sources.snapshot.status).toBe('cachedError') })
  expect(result.current.sources.snapshot.items).toBe(cached)
  expect(result.current.resolve('snapshot', 'snap')).toMatchObject({ verification: 'cachedAfterError' })
  failSnapshot = false
  await act(async () => { await result.current.retry('snapshot') })
  await waitFor(() => { expect(result.current.sources.snapshot.status).toBe('ready') })
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/get_policies', '/api/get_recovery_app_policies', '/api/get_clean_room_policies', '/api/get_policies', '/api/get_policies',
  ])
  unmount()
  client.clear()
})
