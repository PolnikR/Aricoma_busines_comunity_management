import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deletePlatformProvider,
  fetchPlatformProviders,
  submitPlatformProvider,
} from './platformProvidersApi'
import type {
  PlatformProviderRecord,
  PlatformProviderSubmitData,
} from '../model/platformProviderTypes'

const airflowProvider: PlatformProviderRecord = {
  id: 'airflow-01',
  name: 'Primary Airflow',
  description: 'Application recovery DAG orchestration.',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.55',
  port: 22,
  dagDir: '/home/airflow/dags',
  credentialId: 'airflow-ssh',
  credentialStatus: 'ok',
  vmPrefix: 'platform-',
  vmTags: ['platform-tag'],
}

const platformProviderSubmitData: PlatformProviderSubmitData = {
  id: 'airflow-02',
  name: 'Secondary Airflow',
  description: 'Secondary DAG orchestration.',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.56',
  port: 22,
  dagDir: '/opt/airflow/dags',
  credentialId: 'airflow-ssh',
  url: 'http://10.99.99.56:8080/',
  vmPrefix: null,
  vmTags: [],
}

function stubFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(payload === null ? null : JSON.stringify(payload), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPlatformProviders', () => {
  it('loads and validates platform providers independently from infrastructure providers', async () => {
    const fetchMock = stubFetch({ providers: [airflowProvider] })

    await expect(fetchPlatformProviders()).resolves.toMatchObject([airflowProvider])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_platform_providers')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('applies the generated SSH port default when the response omits port', async () => {
    const backendProvider = { ...airflowProvider, port: undefined }
    stubFetch({ providers: [backendProvider] })

    const providers = await fetchPlatformProviders()

    expect(providers[0]?.port).toBe(22)
  })

  it('uses the safe unavailable status when the generated response omits credential status', async () => {
    stubFetch({ providers: [{ ...airflowProvider, credentialStatus: undefined }] })

    const providers = await fetchPlatformProviders()

    expect(providers[0]?.credentialStatus).toBe('none')
  })

  it('preserves the validated GET record before applying UI fallbacks', async () => {
    const backendProvider = {
      ...airflowProvider,
      description: null,
      url: null,
      credentialStatus: null,
    }
    stubFetch({ providers: [backendProvider] })

    const [provider] = await fetchPlatformProviders()

    expect(provider).toMatchObject({
      description: '',
      credentialStatus: 'none',
    })
    expect(provider?.rawRecord).toEqual({ ...backendProvider, role: 'source' })
  })

  it.each([
    ['invalid port', { ...airflowProvider, port: 70000 }],
    ['infrastructure type', { ...airflowProvider, type: 'VMWARE' }],
    ['unknown type', { ...airflowProvider, type: 'UNKNOWN' }],
  ])('rejects a platform provider with %s', async (_case, provider) => {
    stubFetch({ providers: [provider] })
    await expect(fetchPlatformProviders()).rejects.toBeInstanceOf(Error)
  })

  it('throws a stable error for an unsuccessful list request', async () => {
    stubFetch(null, 503)
    await expect(fetchPlatformProviders()).rejects.toThrow(
      'Get platform providers request failed with status 503',
    )
  })
})

describe('submitPlatformProvider', () => {
  it('posts the platform-provider contract and validates the returned list', async () => {
    const returnedProviders = [airflowProvider, platformProviderSubmitData]
    const fetchMock = stubFetch({ providers: returnedProviders })

    await expect(submitPlatformProvider(platformProviderSubmitData)).resolves.toEqual(returnedProviders)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_platform_provider')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(platformProviderSubmitData))
    const headers = new Headers(init.headers)
    expect(headers.get('X-User')).toBe('admin')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('throws a stable error for an unsuccessful submit request', async () => {
    stubFetch(null, 400)
    await expect(submitPlatformProvider(platformProviderSubmitData)).rejects.toThrow(
      'Submit platform provider request failed with status 400',
    )
  })

  it('rejects an invalid provider before sending it to the backend', async () => {
    const fetchMock = stubFetch({ providers: [] })

    await expect(submitPlatformProvider({
      ...platformProviderSubmitData,
      port: 0,
    })).rejects.toBeInstanceOf(Error)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deletePlatformProvider', () => {
  it('URL-encodes provider_id and validates the returned list', async () => {
    const fetchMock = stubFetch({ providers: [platformProviderSubmitData] })

    await expect(deletePlatformProvider('airflow/main 01')).resolves.toEqual([
      platformProviderSubmitData,
    ])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_platform_provider?provider_id=airflow%2Fmain+01')
    expect(init.method).toBe('DELETE')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('throws a stable error for an unsuccessful delete request', async () => {
    stubFetch(null, 404)
    await expect(deletePlatformProvider('missing')).rejects.toThrow(
      'Delete platform provider request failed with status 404',
    )
  })
})
