import type { AccessLogsResponse, AccessLogsResponseOutput } from '@/generated/query/zod'
import type { AccessLogRecord } from './accessLogTypes'

function toAccessLogRecord(entry: AccessLogsResponseOutput['entries'][number]): AccessLogRecord {
  if ('raw' in entry) return { kind: 'raw', raw: entry.raw }

  return {
    kind: 'request',
    method: entry.method,
    path: entry.path,
    status: entry.status,
    durationMs: entry.duration_ms,
    ...(entry.user != null ? { user: entry.user } : {}),
    timestamp: entry.timestamp,
    requestBody: entry.request_body,
    responseBody: entry.response_body,
  }
}

const selectAccessLogRecords = (response: AccessLogsResponseOutput): AccessLogRecord[] =>
  response.entries.map(toAccessLogRecord)

// validatingMutator parses the response through the zod schema before handing it to
// react-query, so select receives the Output shape even though the generated hook
// declares the Input shape. The cast keeps the accurate Output types.
export const selectAccessLogs = selectAccessLogRecords as (response: AccessLogsResponse) => AccessLogRecord[]
