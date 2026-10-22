import { QueryObserver, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSubmitProviderMutationOptions, getDeleteProviderMutationOptions, getGetProvidersQueryOptions } from '@/generated/query/providers/providers.gen'
import { getSubmitPlatformProviderMutationOptions, getDeletePlatformProviderMutationOptions, getGetPlatformProvidersQueryOptions } from '@/generated/query/platform-providers/platform-providers.gen'
import { getSubmitCredentialMutationOptions, getDeleteCredentialMutationOptions } from '@/generated/query/credentials/credentials.gen'
import { createAppQueryClient } from './createAppQueryClient'
import { beginProviderInventoryMutation, getProviderInventoryRevision, isProviderInventoryDeleted } from './providerInventoryRevision'

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
    return Promise.resolve(Response.json(url.includes('credential') ? { credentials: [] } : { providers: [] }, { status: fail ? 500 : 200 }))
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
const credential = { id: 'credential-a', name: 'A', username: 'test-user', password: 'test-fixture' }

describe('provider mutation dependent cache', () => {
  it.each(['provider save', 'provider delete', 'credential save', 'credential delete'])('preserves a known deletion and its revision after failed %s', async (operation) => {
    const { client } = setup(true)
    beginProviderInventoryMutation(client, provider.id, true)
    const revision = getProviderInventoryRevision(client, provider.id)
    let pending: Promise<unknown>
    switch (operation) {
      case 'provider save':
        pending = client.getMutationCache().build(client, getSubmitProviderMutationOptions(client)).execute({ data: provider })
        break
      case 'provider delete':
        pending = client.getMutationCache().build(client, getDeleteProviderMutationOptions(client)).execute({ params: { provider_id: provider.id } })
        break
      case 'credential save':
        pending = client.getMutationCache().build(client, getSubmitCredentialMutationOptions(client)).execute({ data: credential })
        break
      default:
        pending = client.getMutationCache().build(client, getDeleteCredentialMutationOptions(client)).execute({ params: { credential_id: credential.id } })
    }
    await expect(pending).rejects.toThrow()
    expect(isProviderInventoryDeleted(client, provider.id)).toBe(true)
    expect(getProviderInventoryRevision(client, provider.id)).toEqual(revision)
  })

  it('refetches actual generated provider lists after a credential is deleted', async () => {
    const { client } = setup()
    let credentialDeleted = false
    vi.stubGlobal('fetch', (url: string) => {
      if (url.startsWith('/api/delete_credential')) {
        credentialDeleted = true
        return Promise.resolve(Response.json({ credentials: [] }))
      }
      return Promise.resolve(Response.json({ providers: [{ ...provider, credentialId: credential.id, credentialStatus: credentialDeleted ? 'missing' : 'ok' }] }))
    })
    const infra = new QueryObserver(client, getGetProvidersQueryOptions({ role: 'all' }))
    const platform = new QueryObserver(client, getGetPlatformProvidersQueryOptions({ type: 'all' }))
    subscriptions.push(infra.subscribe(() => undefined), platform.subscribe(() => undefined))
    await vi.waitFor(() => {
      expect(infra.getCurrentResult().data?.providers[0]?.credentialStatus).toBe('ok')
      expect(platform.getCurrentResult().data?.providers[0]?.credentialStatus).toBe('ok')
    })
    await client.getMutationCache().build(client, getDeleteCredentialMutationOptions(client)).execute({ params: { credential_id: credential.id } })
    expect(infra.getCurrentResult().data?.providers[0]?.credentialStatus).toBe('missing')
    expect(platform.getCurrentResult().data?.providers[0]?.credentialStatus).toBe('missing')
  })

  it.each(['save', 'delete'])('refreshes related provider inventories and statuses after credential %s', async operation => {
    const { client } = setup()
    client.setQueryData(['/get_providers', { role: 'all' }], { providers: [{ id: 'infra-a', credentialId: 'credential-a' }, { id: 'infra-b', credentialId: 'other' }] })
    client.setQueryData(['/get_platform_providers', { type: 'all' }], { providers: [{ id: 'airflow-a', credentialId: 'credential-a' }] })
    const affected = ['/get_volumes', { provider_id: 'infra-a' }]
    const unrelated = ['/get_volumes', { provider_id: 'infra-b' }]
    const inactive = ['/tags', { provider_id: 'infra-a' }]
    const runs = ['/get_orchestrator_runs', { provider_id: 'airflow-a' }]
    await inventory(client, affected)
    await inventory(client, unrelated)
    const inactiveOptions = await inventory(client, inactive, false)
    await inventory(client, runs)
    if (operation === 'save') await client.getMutationCache().build(client, getSubmitCredentialMutationOptions(client)).execute({ data: credential })
    else await client.getMutationCache().build(client, getDeleteCredentialMutationOptions(client)).execute({ params: { credential_id: credential.id } })
    expect(client.getQueryData(affected)).toEqual({ version: 2 })
    expect(client.getQueryData(unrelated)).toEqual({ version: 1 })
    expect(client.getQueryData(runs)).toEqual({ version: 2 })
    expect(client.getQueryState(['/get_providers', { role: 'all' }])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['/get_platform_providers', { type: 'all' }])?.isInvalidated).toBe(true)
    expect(client.getQueryState(inactive)?.isInvalidated).toBe(true)
    const observer = new QueryObserver(client, inactiveOptions)
    subscriptions.push(observer.subscribe(() => undefined))
    await vi.waitFor(() => { expect(observer.getCurrentResult().data).toEqual({ version: 2 }) })
  })

  it('uses inventory-family fallback when cached provider relationships are incomplete', async () => {
    const { client } = setup()
    client.setQueryData(['/get_providers', { role: 'source' }], { providers: [] })
    const key = ['/get_volumes', { provider_id: 'unknown' }]
    const unrelated = ['/unrelated']
    await inventory(client, key)
    await inventory(client, unrelated)
    await client.getMutationCache().build(client, getSubmitCredentialMutationOptions(client)).execute({ data: credential })
    expect(client.getQueryData(key)).toEqual({ version: 2 })
    expect(client.getQueryData(unrelated)).toEqual({ version: 1 })
  })

  it('keeps provider status and inventory fresh after a failed credential mutation', async () => {
    const { client } = setup(true)
    const providersKey = ['/get_providers', { role: 'all' }]
    client.setQueryData(providersKey, { providers: [{ id: 'infra-a', credentialId: credential.id }] })
    const key = ['/get_volumes', { provider_id: 'infra-a' }]
    await inventory(client, key)
    await expect(client.getMutationCache().build(client, getSubmitCredentialMutationOptions(client)).execute({ data: credential })).rejects.toThrow()
    expect(client.getQueryState(providersKey)?.isInvalidated).toBe(false)
    expect(client.getQueryData(key)).toEqual({ version: 1 })
  })

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

  it.each(['save', 'delete'])('handles platform %s without touching an infrastructure provider with the same ID', async (operation) => {
    const { client } = setup()
    const runs = ['/get_orchestrator_runs', { provider_id: 'infra-a', dag_id: 'dag-a' }]
    const infra = ['/get_volumes', { provider_id: 'infra-a' }]
    await inventory(client, runs)
    await inventory(client, infra)
    const revision = getProviderInventoryRevision(client, provider.id)
    if (operation === 'save') {
      await client.getMutationCache().build(client, getSubmitPlatformProviderMutationOptions(client)).execute({ data: { id: 'infra-a', name: 'Airflow', type: 'AIRFLOW' } })
      expect(client.getQueryData(runs)).toEqual({ version: 2 })
    } else {
      await client.getMutationCache().build(client, getDeletePlatformProviderMutationOptions(client)).execute({ params: { provider_id: provider.id } })
      expect(client.getQueryData(runs)).toBeUndefined()
    }
    expect(client.getQueryData(infra)).toEqual({ version: 1 })
    expect(getProviderInventoryRevision(client, provider.id)).toEqual(revision)
    expect(isProviderInventoryDeleted(client, provider.id)).toBe(false)
  })
})
