import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteProvider, fetchProviders, submitProvider } from '@/features/api/providersApi'
import type { ProviderRecord } from '@/features/api/providersApi'

const providerA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter Source',
  description: 'Primary VMware vCenter for production virtual infrastructure.',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
}

const providerB: ProviderRecord = {
  id: 'ibm-flashsystem-01',
  name: 'IBM FlashSystem Source',
  description: 'Primary IBM FlashSystem storage array.',
  type: 'FLASHCOPY',
  ipAddress: '10.99.99.246',
}

const listPayload = { providers: [providerA, providerB] }

function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue(new Response(payload === null ? null : JSON.stringify(payload), { status }))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('fetchProviders', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the validated provider list', async () => {
    const mock = stubFetch(listPayload)

    const providers = await fetchProviders()

    expect(mock).toHaveBeenCalledWith('/api/get_providers', { headers: { Accept: 'application/json' } })
    expect(providers).toHaveLength(2)
    expect(providers[0]).toMatchObject({ id: 'vmware-vcenter-01', type: 'VMWARE', ipAddress: '10.99.99.40' })
  })

  it('rejects a response that does not match the providers contract', async () => {
    stubFetch({ providers: 'invalid' })
    await expect(fetchProviders()).rejects.toBeInstanceOf(Error)
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 503)
    await expect(fetchProviders()).rejects.toThrow('Get providers request failed with status 503')
  })
})

describe('submitProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a single provider object', async () => {
    const newProvider: ProviderRecord = { id: 'new-01', name: 'New', description: 'x', type: 'VMWARE', ipAddress: '10.0.0.1' }
    const mock = stubFetch({})

    await submitProvider(newProvider)

    expect(mock).toHaveBeenCalledWith('/api/submit_provider', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(newProvider),
    })
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 500)
    await expect(submitProvider(providerA)).rejects.toThrow('Submit provider request failed with status 500')
  })
})

describe('deleteProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls delete with the provider_id and returns the remaining list', async () => {
    const mock = stubFetch({ providers: [providerB] })

    const result = await deleteProvider('vmware-vcenter-01')

    expect(mock).toHaveBeenCalledWith('/api/delete_provider?provider_id=vmware-vcenter-01', {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
    expect(result).toEqual([providerB])
  })

  it('url-encodes the provider id', async () => {
    const mock = stubFetch({ providers: [] })
    await deleteProvider('vmware/vcenter 01')
    expect(mock).toHaveBeenCalledWith('/api/delete_provider?provider_id=vmware%2Fvcenter%2001', expect.anything())
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 404)
    await expect(deleteProvider('missing')).rejects.toThrow('Delete provider request failed with status 404')
  })
})
