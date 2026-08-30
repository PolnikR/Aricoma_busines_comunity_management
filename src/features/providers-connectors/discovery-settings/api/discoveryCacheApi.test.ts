import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchDiscoveryCacheConfig,
  fetchDiscoveryCacheHistory,
  updateDiscoveryCacheConfig,
} from './discoveryCacheApi'

function stubFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(payload === null ? null : JSON.stringify(payload), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const configPayload = { defaults: { VMWARE: 120, NEW_PROVIDER: 90 }, history_retention: { retention_days: 30, max_records: 100 } }

afterEach(() => vi.unstubAllGlobals())

describe('Discovery Cache API', () => {
  it('gets and maps the cache config', async () => {
    const fetchMock = stubFetch(configPayload)
    await expect(fetchDiscoveryCacheConfig()).resolves.toEqual({ defaults: configPayload.defaults, historyRetention: { retentionDays: 30, maxRecords: 100 } })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/discovery/cache/config')
    expect(init.method).toBe('GET')
  })

  it('sends an exact partial config update', async () => {
    const fetchMock = stubFetch(configPayload)
    await updateDiscoveryCacheConfig({ historyRetention: { retentionDays: 60 } })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/discovery/cache/config')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ history_retention: { retention_days: 60 } }))
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it.each([0, -1, 1.5])('rejects an invalid positive-integer patch value %s before HTTP', async value => {
    const fetchMock = stubFetch(configPayload)
    await expect(updateDiscoveryCacheConfig({ defaults: { VMWARE: value } })).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gets history with encoded filters and maps camelCase fields', async () => {
    const fetchMock = stubFetch({ runs: [{ provider_id: 'vmware/01', provider_type: 'VMWARE', triggered_by: 'stale', started_at: '2026-01-01T00:00:00Z', duration_ms: 12, success: true }] })
    await expect(fetchDiscoveryCacheHistory({ providerId: 'vmware/01', limit: 5 })).resolves.toEqual({ runs: [{ providerId: 'vmware/01', providerType: 'VMWARE', triggeredBy: 'stale', startedAt: '2026-01-01T00:00:00Z', durationMs: 12, success: true }] })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/discovery/cache/history?provider_id=vmware%2F01&limit=5')
  })

  it('gets history without filters', async () => {
    const fetchMock = stubFetch({ runs: [] })
    await expect(fetchDiscoveryCacheHistory()).resolves.toEqual({ runs: [] })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/discovery/cache/history')
  })

  it.each([0, -1, 1.5])('rejects an invalid history limit %s before HTTP', async limit => {
    const fetchMock = stubFetch({ runs: [] })
    await expect(fetchDiscoveryCacheHistory({ limit })).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['config', () => fetchDiscoveryCacheConfig(), { defaults: 'bad', history_retention: {} }],
    ['history', () => fetchDiscoveryCacheHistory(), { runs: 'bad' }],
  ])('rejects an invalid %s success response', async (_name, operation, payload) => {
    stubFetch(payload)
    await expect(operation()).rejects.toMatchObject({ name: 'GeneratedResponseContractError' })
  })

  it.each([400, 403, 500])('wraps HTTP %s errors with the Orval cause', async status => {
    stubFetch({ detail: 'no' }, status)
    await expect(fetchDiscoveryCacheConfig()).rejects.toMatchObject({ cause: { name: 'OrvalApiError', status } })
  })
})
