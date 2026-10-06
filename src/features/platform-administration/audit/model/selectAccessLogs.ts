import type { AccessLogsResponseOutput } from '@/generated/query/zod'
import type { AccessLogRecord } from './accessLogTypes'

function toAccessLogRecord(entry: AccessLogsResponseOutput['entries'][number]): AccessLogRecord {
  if ('raw' in entry) return { kind: 'raw', raw: entry.raw }

  return {
    kind: 'request',
    method: entry.method,
    path: entry.path,
    ...(entry.query_string ? { queryString: entry.query_string } : {}),
    ...(entry.user_agent ? { userAgent: entry.user_agent } : {}),
    ...(entry.referer ? { referer: entry.referer } : {}),
    status: entry.status,
    durationMs: entry.duration_ms,
    ...(entry.user != null ? { user: entry.user } : {}),
    timestamp: entry.timestamp,
    requestBody: entry.request_body,
    responseBody: entry.response_body,
  }
}

// Ordering contract (not documented in the OpenAPI schema): the BE currently returns the
// requested window oldest → newest, and the FE reverses it so page 1 starts with the newest.
// Reversing instead of sorting by timestamp keeps raw fallback entries (no timestamp) in their
// BE-relative position. If the BE response ordering changes, revisit this assumption.
const selectAccessLogRecords = (response: AccessLogsResponseOutput): AccessLogRecord[] =>
  [...response.entries].reverse().map(toAccessLogRecord)

// validatingMutator hands select the parsed Output shape; for this schema it is
// identical to the Input shape the generated hook declares.
export const selectAccessLogs = selectAccessLogRecords
