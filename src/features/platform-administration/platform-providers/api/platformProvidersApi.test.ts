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
  url: 'http://10.99.99.55:8080/',
  ipAddress: '10.99.99.55',
  port: 22,
  dagDir: '/home/airflow/dags',
  credentialId: 'airflow-ssh',
  credentialStatus: 'ok',
  notificationEmail: 'platform-alerts@example.test',
}

const smtpProvider: PlatformProviderRecord = {
  id: 'smtp-01',
  name: 'Test SMTP',
  description: 'Local test SMTP relay.',
  type: 'SMTP',
  url: 'http://10.99.99.53:8025/',
  ipAddress: '10.99.99.53',
  port: 1025,
  credentialStatus: 'none',
  fromEmail: 'airflow@example.com',
  disableSsl: true,
  disableTls: true,
}

const backendProvider: PlatformProviderRecord = {
  id: 'backend',
  name: 'ABCo API',
  description: 'Backend service.',
  type: 'BACKEND',
  url: 'http://10.99.99.54:8000/',
  credentialStatus: 'none',
  notificationEmail: 'abcobe@example.com',
  loggingEnabled: true,
  jwtEnabled: false,
  swaggerEnabled: true,
}

const keycloakProvider: PlatformProviderRecord = {
  id: 'keycloak-01',
  name: 'Aricoma Keycloak',
  description: 'Realm role sync target.',
  type: 'KEYCLOAK',
  url: 'http://10.99.99.53:8081',
  credentialStatus: 'ok',
  realm: 'aricoma',
  clientId: 'abco-be',
  credentialId: 'keycloak-admin',
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
  notificationEmail: null,
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
  it('maps each platform-provider type to only its owned configuration fields', async () => {
    const rawProviders = [
      {
        ...airflowProvider,
        fromEmail: 'must-not-leak@example.test',
        loggingEnabled: true,
        realm: 'must-not-leak',
      },
      {
        ...smtpProvider,
        dagDir: '/must/not/leak',
        credentialId: 'must-not-leak',
        jwtEnabled: true,
      },
      {
        ...backendProvider,
        ipAddress: '10.0.0.1',
        port: 9999,
        dagDir: '/must/not/leak',
        realm: 'must-not-leak',
      },
      {
        ...keycloakProvider,
        ipAddress: '10.0.0.2',
        port: 1234,
        dagDir: '/must/not/leak',
        loggingEnabled: true,
      },
    ]
    const fetchMock = stubFetch({ providers: rawProviders })

    const providers = await fetchPlatformProviders()

    expect(providers).toHaveLength(4)
    expect(providers[0]).toMatchObject(airflowProvider)
    expect(providers[0]).not.toHaveProperty('fromEmail')
    expect(providers[0]).not.toHaveProperty('loggingEnabled')
    expect(providers[0]).not.toHaveProperty('realm')

    expect(providers[1]).toMatchObject(smtpProvider)
    expect(providers[1]).not.toHaveProperty('dagDir')
    expect(providers[1]).not.toHaveProperty('credentialId')
    expect(providers[1]).not.toHaveProperty('jwtEnabled')

    expect(providers[2]).toMatchObject(backendProvider)
    expect(providers[2]).not.toHaveProperty('ipAddress')
    expect(providers[2]).not.toHaveProperty('port')
    expect(providers[2]).not.toHaveProperty('dagDir')
    expect(providers[2]).not.toHaveProperty('realm')

    expect(providers[3]).toMatchObject(keycloakProvider)
    expect(providers[3]).not.toHaveProperty('ipAddress')
    expect(providers[3]).not.toHaveProperty('port')
    expect(providers[3]).not.toHaveProperty('dagDir')
    expect(providers[3]).not.toHaveProperty('loggingEnabled')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_platform_providers')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('applies the generated SSH port default to AIRFLOW when the response omits port', async () => {
    stubFetch({ providers: [{ ...airflowProvider, port: undefined }] })

    const providers = await fetchPlatformProviders()

    expect(providers[0]).toMatchObject({ type: 'AIRFLOW', port: 22 })
  })

  it('uses the safe unavailable status when the generated response omits credential status', async () => {
    stubFetch({ providers: [{ ...airflowProvider, credentialStatus: undefined }] })

    const providers = await fetchPlatformProviders()

    expect(providers[0]?.credentialStatus).toBe('none')
  })

  it.each([
    ['null', null],
    ['omitted', undefined],
  ])('accepts an AIRFLOW provider with a %s DAG directory', async (_case, dagDir) => {
    stubFetch({ providers: [{ ...airflowProvider, dagDir }] })

    await expect(fetchPlatformProviders()).resolves.toMatchObject([{
      id: airflowProvider.id,
      type: 'AIRFLOW',
      dagDir: '',
    }])
  })

  it('preserves the validated GET record separately from UI normalization', async () => {
    const rawProvider = {
      ...backendProvider,
      description: null,
      url: null,
      credentialStatus: null,
      ipAddress: 'raw-only-value',
    }
    stubFetch({ providers: [rawProvider] })

    const [provider] = await fetchPlatformProviders()

    expect(provider).toMatchObject({
      type: 'BACKEND',
      description: '',
      credentialStatus: 'none',
      notificationEmail: 'abcobe@example.com',
    })
    expect(provider).not.toHaveProperty('ipAddress')
    expect(provider?.rawRecord).toEqual({ ...rawProvider, role: 'source', port: 22 })
  })

  it.each(['VMWARE', 'FLASHCOPY', 'IBM_POWER'] as const)(
    'rejects generated provider type %s from the platform-provider endpoint',
    async (type) => {
      stubFetch({ providers: [{ ...airflowProvider, type }] })

      await expect(fetchPlatformProviders()).rejects.toThrow(
        `Unsupported platform provider type: ${type}`,
      )
    },
  )

  it('rejects a platform provider with an unknown OpenAPI type', async () => {
    stubFetch({ providers: [{ ...airflowProvider, type: 'UNKNOWN' }] })
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
    const fetchMock = stubFetch({ providers: [platformProviderSubmitData] })

    await expect(submitPlatformProvider(platformProviderSubmitData)).resolves.toMatchObject([{
      id: platformProviderSubmitData.id,
      name: platformProviderSubmitData.name,
      type: 'AIRFLOW',
      ipAddress: platformProviderSubmitData.ipAddress,
      port: 22,
      dagDir: platformProviderSubmitData.dagDir,
      credentialId: platformProviderSubmitData.credentialId,
      notificationEmail: null,
    }])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_platform_provider')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toMatchObject(platformProviderSubmitData)
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

  it('posts null notificationEmail when clearing an existing value', async () => {
    const fetchMock = stubFetch({ providers: [] })
    const provider: PlatformProviderSubmitData = {
      ...platformProviderSubmitData,
      notificationEmail: null,
    }

    await submitPlatformProvider(provider)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ notificationEmail: null })
  })

  it('preserves SMTP fields in the submit payload', async () => {
    const fetchMock = stubFetch({ providers: [] })
    const provider: PlatformProviderSubmitData = {
      id: 'smtp-02',
      name: 'Secondary SMTP',
      type: 'SMTP',
      port: 1025,
      fromEmail: 'airflow@example.com',
      disableSsl: true,
      disableTls: true,
    }

    await submitPlatformProvider(provider)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      type: 'SMTP',
      fromEmail: 'airflow@example.com',
      disableSsl: true,
      disableTls: true,
    })
  })

  it('rejects a provider with an unknown OpenAPI type before sending it to the backend', async () => {
    const fetchMock = stubFetch({ providers: [] })

    await expect(submitPlatformProvider({
      ...platformProviderSubmitData,
      type: 'UNKNOWN' as never,
    })).rejects.toBeInstanceOf(Error)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deletePlatformProvider', () => {
  it('URL-encodes provider_id and validates the returned list', async () => {
    const fetchMock = stubFetch({ providers: [platformProviderSubmitData] })

    await expect(deletePlatformProvider('airflow/main 01')).resolves.toMatchObject([{
      id: platformProviderSubmitData.id,
      type: 'AIRFLOW',
    }])

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
