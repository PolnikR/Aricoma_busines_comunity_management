import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteProvider, fetchProviders, submitProvider, testProviderConnection } from './providersApi'
import type { ProviderRecord, ProviderSubmitData } from '../model/providerTypes'

const providerA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter Source',
  description: 'Primary VMware vCenter for production virtual infrastructure.',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  url: 'https://10.99.99.40/ui/',
  port: 22,
  credentialId: 'vcenter-admin',
  role: 'source',
  notificationEmail: 'provider-alerts@example.test',
  credentialStatus: 'ok',
}

const providerB: ProviderRecord = {
  id: 'ibm-flashsystem-01',
  name: 'IBM FlashSystem Source',
  description: 'Primary IBM FlashSystem storage array.',
  type: 'FLASHCOPY',
  ipAddress: '10.99.99.246',
  port: 22,
  credentialId: 'ibm-admin',
  role: 'source',
  credentialStatus: 'ok',
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

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_providers?role=all')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
    expect(providers).toHaveLength(2)
    expect(providers[0]).toMatchObject({
      id: 'vmware-vcenter-01',
      type: 'VMWARE',
      ipAddress: '10.99.99.40',
      url: 'https://10.99.99.40/ui/',
    })
  })

  it('accepts the current backend response without a port field', async () => {
    const backendProvider = { ...providerA }
    delete backendProvider.port
    stubFetch({ providers: [backendProvider] })

    const providers = await fetchProviders()

    expect(providers[0]).not.toHaveProperty('port')
  })

  it('applies the generated source role default when the response omits role', async () => {
    const backendProvider = { ...providerA }
    delete backendProvider.role
    stubFetch({ providers: [backendProvider] })

    const providers = await fetchProviders()

    expect(providers[0]?.role).toBe('source')
  })

  it('preserves the validated GET record before applying UI fallbacks', async () => {
    const backendProvider = {
      ...providerA,
      description: null,
      credentialStatus: null,
    }
    stubFetch({ providers: [backendProvider] })

    const [provider] = await fetchProviders()

    expect(provider).toMatchObject({
      description: '',
      credentialStatus: 'none',
    })
    expect(provider?.rawRecord).toEqual({
      id: providerA.id,
      name: providerA.name,
      description: null,
      type: providerA.type,
      role: providerA.role,
      ipAddress: providerA.ipAddress,
      credentialId: providerA.credentialId,
      url: providerA.url,
      notificationEmail: providerA.notificationEmail,
      credentialStatus: null,
    })
  })

  it.each([
    ['source', '/api/get_providers?role=source'],
    ['target', '/api/get_providers?role=target'],
  ] as const)('passes the role filter %s', async (role, expectedUrl) => {
    const mock = stubFetch(listPayload)

    await fetchProviders(role)

    expect(mock.mock.calls[0]?.[0]).toBe(expectedUrl)
  })

  it('preserves an optional default FlashSystem provider reference', async () => {
    stubFetch({
      providers: [{
        ...providerA,
        defaultFlashcopyProviderId: 'ibm-flashsystem-01',
      }],
    })

    const providers = await fetchProviders()

    expect(providers[0]).toMatchObject({
      id: 'vmware-vcenter-01',
      defaultFlashcopyProviderId: 'ibm-flashsystem-01',
    })
  })

  it('preserves VM settings from the provider response', async () => {
    stubFetch({
      providers: [{
        ...providerA,
        vmPrefix: 'prod-',
        vmTags: ['Production', 'Database'],
      }],
    })

    const [provider] = await fetchProviders()

    expect(provider).toMatchObject({
      vmPrefix: 'prod-',
      vmTags: ['Production', 'Database'],
    })
  })

  it('rejects a response that does not match the providers contract', async () => {
    stubFetch({ providers: 'invalid' })
    await expect(fetchProviders()).rejects.toBeInstanceOf(Error)
  })

  it.each([
    ['missing id', { ...providerA, id: undefined }],
    ['empty id', { ...providerA, id: '' }],
    ['invalid type', { ...providerA, type: 'UNKNOWN' }],
    ['invalid credential status', { ...providerA, credentialStatus: 'unknown' }],
    ['invalid notification email', { ...providerA, notificationEmail: 'not-an-email' }],
  ])('rejects a provider with %s', async (_label, provider) => {
    stubFetch({ providers: [provider] })
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
    const newProvider: ProviderSubmitData = {
      id: 'new-01',
      name: 'New',
      description: 'x',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      credentialId: 'vcenter-admin',
      role: 'source',
    }
    const mock = stubFetch({})

    await submitProvider(newProvider)

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_provider')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(newProvider))
    const headers = new Headers(init.headers)
    expect(headers.get('X-User')).toBe('admin')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('posts explicit empty VM settings when clearing them', async () => {
    const mock = stubFetch({})
    const provider: ProviderSubmitData = {
      id: providerA.id,
      name: providerA.name,
      description: providerA.description,
      type: providerA.type,
      ipAddress: providerA.ipAddress,
      credentialId: providerA.credentialId,
      role: providerA.role ?? 'source',
      vmPrefix: null,
      vmTags: [],
    }

    await submitProvider(provider)

    const [, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe(JSON.stringify(provider))
  })

  it('posts null notificationEmail when clearing an existing value', async () => {
    const mock = stubFetch({})
    const provider: ProviderSubmitData = {
      id: providerA.id,
      name: providerA.name,
      description: providerA.description,
      type: providerA.type,
      ipAddress: providerA.ipAddress,
      credentialId: providerA.credentialId,
      role: providerA.role ?? 'source',
      notificationEmail: null,
    }

    await submitProvider(provider)

    const [, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ notificationEmail: null })
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 500)
    const submitData: ProviderSubmitData = {
      id: providerA.id,
      name: providerA.name,
      description: providerA.description,
      type: providerA.type,
      ipAddress: providerA.ipAddress,
      credentialId: providerA.credentialId,
      role: providerA.role ?? 'source',
    }
    await expect(submitProvider(submitData)).rejects.toThrow('Submit provider request failed with status 500')
  })

  it('rejects a provider with an invalid URL', async () => {
    stubFetch({ providers: [{ ...providerA, url: 'not-a-url' }] })

    await expect(fetchProviders()).rejects.toBeInstanceOf(Error)
  })

})

describe('deleteProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls delete with the provider_id and returns the remaining list', async () => {
    const mock = stubFetch({ providers: [providerB] })

    const result = await deleteProvider('vmware-vcenter-01')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_provider?provider_id=vmware-vcenter-01')
    expect(init.method).toBe('DELETE')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: providerB.id,
      name: providerB.name,
      type: providerB.type,
    })
    expect(result[0]).not.toHaveProperty('port')
  })

  it('url-encodes the provider id', async () => {
    const mock = stubFetch({ providers: [] })
    await deleteProvider('vmware/vcenter 01')
    expect(mock).toHaveBeenCalledWith('/api/delete_provider?provider_id=vmware%2Fvcenter+01', expect.anything())
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 404)
    await expect(deleteProvider('missing')).rejects.toThrow('Delete provider request failed with status 404')
  })
})

describe('testProviderConnection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls test_provider with the provider_id and returns the mapped result', async () => {
    const mock = stubFetch({
      provider_id: 'vmware-vcenter-01',
      provider_type: 'VMWARE',
      ok: true,
      checks: [{ name: 'Credentials', status: 'ok', detail: 'Credential validated' }],
    })

    const result = await testProviderConnection('vmware-vcenter-01')

    const [url] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/test_provider?provider_id=vmware-vcenter-01')
    expect(result).toEqual({
      ok: true,
      providerId: 'vmware-vcenter-01',
      providerType: 'VMWARE',
      checks: [{ name: 'Credentials', status: 'ok', detail: 'Credential validated' }],
    })
  })

  it('rejects a response that does not match the test-provider contract', async () => {
    stubFetch({ provider_id: 'vmware-vcenter-01' })
    await expect(testProviderConnection('vmware-vcenter-01')).rejects.toThrow()
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 500)
    await expect(testProviderConnection('vmware-vcenter-01')).rejects.toThrow(
      'Test provider connection request failed with status 500',
    )
  })
})
