import { QueryObserver, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSubmitProviderMutationOptions, getDeleteProviderMutationOptions } from '@/generated/query/providers/providers.gen'
import { getSubmitPlatformProviderMutationOptions } from '@/generated/query/platform-providers/platform-providers.gen'
import { createAppQueryClient } from './createAppQueryClient'

const clients: QueryClient[] = []
const subscriptions: (() => void)[] = []
afterEach(() => {
  subscriptions.splice(0).forEach(unsubscribe => { unsubscribe() })
  clients.splice(0).forEach(client => { client.clear() })
  vi.unstubAllGlobals()
})

function setup(fail = false) {
  const client = createAppQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
  clients.push(client)
  let version = 1
  const fetch = vi.fn((url: string) => {
    if (url.startsWith('/inventory/')) return Promise.resolve(Response.json({ version }))
    version = 2
    return Promise.resolve(Response.json({ providers: [] }, { status: fail ? 500 : 200 }))
  })
  vi.stubGlobal('fetch', fetch)
  return { client, fetch }
}

async function inventory(client: QueryClient, key: QueryKey, active = true) {
  const options = { queryKey: key, queryFn: async () => {
    const response = await fetch('/inventory/' + JSON.stringify(key))
    return response.json() as Promise<{ version: number }>
  } }
  await client.fetchQuery(options)
  if (active) subscriptions.push(new QueryObserver(client, options).subscribe(() => undefined))
  return options
}

const provider = { id: 'infra-a', name: 'A', type: 'VMWARE' as const, role: 'source' as const }

describe('provider mutation dependent cache', () => {
  it.each([
    ['/get_power_vm', { provider_id: 'infra-a' }],
    ['/get_volumes', { provider_id: 'infra-a' }],
    ['/tags', { provider_id: 'infra-a' }],
    ['/vdisks_by_vm', { provider_id: 'infra-a', vm_name: 'vm' }],
    ['POST', '/vms/search', { provider_id: 'infra-a' }, { name_prefix: 'vm' }],
    ['POST', '/vms/search', {}],
    ['/get_power_vm'],
  ])('refetches active dependent inventory %j after generated provider save', async (...key) => {
    const { client } = setup()
    await inventory(client, key)
    const otherKey = ['/get_power_vm', { provider_id: 'infra-b' }]
    await inventory(client, otherKey)
    let completed = false
    await client.getMutationCache().build(client, getSubmitProviderMutationOptions(client, {
      mutation: { onSuccess: () => { completed = true } },
    })).execute({ data: provider })
    expect(client.getQueryData(key)).toEqual({ version: 2 })
    expect(client.getQueryData(otherKey)).toEqual({ version: 1 })
    expect(completed).toBe(true)
  })

  it('invalidates inactive fresh inventory and refetches when observed', async () => {
    const { client } = setup()
    const key = ['/get_volumes', { provider_id: 'infra-a' }]
    const options = await inventory(client, key, false)
    await client.getMutationCache().build(client, getSubmitProviderMutationOptions(client)).execute({ data: provider })
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    const observer = new QueryObserver(client, options)
    subscriptions.push(observer.subscribe(() => undefined))
    await vi.waitFor(() => { expect(observer.getCurrentResult().data).toEqual({ version: 2 }) })
  })

  it('does not invalidate on failed save', async () => {
    const { client } = setup(true)
    const key = ['/get_volumes', { provider_id: 'infra-a' }]
    await inventory(client, key)
    await expect(client.getMutationCache().build(client, getSubmitProviderMutationOptions(client)).execute({ data: provider })).rejects.toThrow()
    expect(client.getQueryData(key)).toEqual({ version: 1 })
    expect(client.getQueryState(key)?.isInvalidated).toBe(false)
  })

  it('removes deleted-provider inventory without refetching it', async () => {
    const { client, fetch } = setup()
    const key = ['/get_volumes', { provider_id: 'infra-a' }]
    await inventory(client, key)
    await client.getMutationCache().build(client, getDeleteProviderMutationOptions(client)).execute({ params: { provider_id: 'infra-a' } })
    expect(client.getQueryData(key)).toBeUndefined()
    expect(fetch.mock.calls.filter(([url]) => url.startsWith('/inventory/'))).toHaveLength(1)
  })

  it('does not resurrect deleted inventory when a pending request ignores cancellation', async () => {
    const { client } = setup()
    const key = ['/get_volumes', { provider_id: 'infra-a' }]
    let finish: (data: { version: number }) => void = () => { throw new Error('Request not started') }
    const pending = client.fetchQuery({ queryKey: key, queryFn: () => new Promise<{ version: number }>(resolve => { finish = resolve }) }).catch(() => undefined)
    await client.getMutationCache().build(client, getDeleteProviderMutationOptions(client)).execute({ params: { provider_id: 'infra-a' } })
    finish({ version: 1 })
    await pending
    expect(client.getQueryState(key)).toBeUndefined()
  })

  it('refetches platform orchestration without touching an infrastructure provider with the same ID', async () => {
    const { client } = setup()
    const runs = ['/get_orchestrator_runs', { provider_id: 'infra-a', dag_id: 'dag-a' }]
    const infra = ['/get_volumes', { provider_id: 'infra-a' }]
    await inventory(client, runs)
    await inventory(client, infra)
    await client.getMutationCache().build(client, getSubmitPlatformProviderMutationOptions(client)).execute({ data: { id: 'infra-a', name: 'Airflow', type: 'AIRFLOW' } })
    expect(client.getQueryData(runs)).toEqual({ version: 2 })
    expect(client.getQueryData(infra)).toEqual({ version: 1 })
  })
})
