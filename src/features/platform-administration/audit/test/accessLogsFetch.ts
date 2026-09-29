import { vi, type Mock } from 'vitest'
import type { AccessLogFilters, AccessLogRecord } from '../model/accessLogTypes'

export type AccessLogsHandler = Mock<(filters: AccessLogFilters) => Promise<AccessLogRecord[]>>

export function toWireEntry(record: AccessLogRecord) {
  if (record.kind === 'raw') return { raw: record.raw }
  return {
    timestamp: record.timestamp ?? '',
    ...(record.user !== undefined ? { user: record.user } : {}),
    method: record.method,
    path: record.path,
    status: record.status,
    duration_ms: record.durationMs,
    request_body: record.requestBody,
    response_body: record.responseBody,
  }
}

function toFilters(url: URL): AccessLogFilters {
  const read = (name: string) => url.searchParams.get(name)
  const status = read('status')
  const method = read('method')
  const pathContains = read('path_contains')
  return {
    lines: Number(read('lines')),
    ...(status !== null ? { status: Number(status) } : {}),
    ...(method !== null ? { method } : {}),
    ...(pathContains !== null ? { pathContains } : {}),
  }
}

// Stubs the real fetch for GET /api/get_access_logs so tests keep working with
// UI records: the handler receives the filters parsed from the request URL and
// its records are served as the backend wire payload through the generated hook.
export function installAccessLogsFetch(handler: AccessLogsHandler) {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname !== '/api/get_access_logs') throw new Error(`unexpected fetch: ${input}`)
    const records = await handler(toFilters(url))
    return new Response(JSON.stringify({ entries: records.map(toWireEntry) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
