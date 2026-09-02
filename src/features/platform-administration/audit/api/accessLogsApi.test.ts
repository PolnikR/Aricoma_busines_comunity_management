import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAccessLogs } from './accessLogsApi'

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

describe('fetchAccessLogs', () => {
  it('sends only trimmed server filters using generated parameter names', async () => {
    const fetchMock = stubFetch({ entries: [] })

    await fetchAccessLogs({
      lines: 50,
      status: 503,
      method: ' POST ',
      pathContains: ' /api/jobs ',
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_access_logs?lines=50&status=503&method=POST&path_contains=%2Fapi%2Fjobs')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('maps a generated normal entry to a camelCase domain record without changing bodies', async () => {
    const requestBody = { job: 'nightly', options: ['force'] }
    const responseBody = [{ result: 'queued' }]
    stubFetch({
      entries: [{
        method: 'POST',
        path: '/api/jobs',
        status: 202,
        duration_ms: 12.5,
        request_body: requestBody,
        response_body: responseBody,
      }],
    })

    await expect(fetchAccessLogs()).resolves.toEqual([{
      kind: 'request',
      method: 'POST',
      path: '/api/jobs',
      status: 202,
      durationMs: 12.5,
      requestBody,
      responseBody,
    }])
  })

  it('maps a raw fallback entry without losing its value', async () => {
    stubFetch({ entries: [{ raw: 'malformed access log line' }] })

    await expect(fetchAccessLogs()).resolves.toEqual([{
      kind: 'raw',
      raw: 'malformed access log line',
    }])
  })

  it('rejects malformed successful responses at the generated contract boundary', async () => {
    stubFetch({
      entries: [{
        method: 'GET',
        path: '/api/health',
        status: 200,
        duration_ms: 'fast',
        request_body: null,
        response_body: null,
      }],
    })

    await expect(fetchAccessLogs()).rejects.toThrow(
      'GET /get_access_logs response does not match OpenAPI',
    )
  })
})
