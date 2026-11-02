import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { invalidateProviderMutation } from '@/shared/query/providerMutationInvalidation'
import { flashSystemInventoryQuery } from './inventoryQueries'

afterEach(() => { vi.unstubAllGlobals() })

it.each(['submitProvider', 'deleteProvider'] as const)('does not publish a late FlashSystem response after %s', async operation => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let finish!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
  const query = flashSystemInventoryQuery('target')
  const pending = client.fetchQuery(query).catch(() => undefined)
  await vi.waitFor(() => { expect(finish).toBeTypeOf('function') })
  await invalidateProviderMutation(client, [operation], operation === 'submitProvider' ? { data: { id: 'target' } } : { params: { provider_id: 'target' } })
  finish(Response.json({ count: 0, volumes: [], pools: { '1': { name: 'OBSOLETE' } } }))
  await pending
  expect(client.getQueryData(query.queryKey)).toBeUndefined()
  client.clear()
})
