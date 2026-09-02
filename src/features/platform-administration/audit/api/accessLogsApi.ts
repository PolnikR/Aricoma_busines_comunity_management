import { getAccessLogsGetAccessLogsGet } from '@/generated/api/client.gen'
import type { GetAccessLogsGetAccessLogsGetParams } from '@/generated/api/models'
import type { AccessLogsResponseOutput } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type { AccessLogFilters, AccessLogRecord } from '../model/accessLogTypes'
import { accessLogsResponseSchema } from './schemas/accessLogSchema'

function normalizeAccessLogFilters(
  filters: AccessLogFilters,
): GetAccessLogsGetAccessLogsGetParams {
  const method = filters.method?.trim()
  const pathContains = filters.pathContains?.trim()

  return {
    ...(filters.lines !== undefined ? { lines: filters.lines } : {}),
    ...(filters.status !== undefined ? { status: filters.status } : {}),
    ...(method ? { method } : {}),
    ...(pathContains ? { path_contains: pathContains } : {}),
  }
}

function mapAccessLogRecord(
  entry: AccessLogsResponseOutput['entries'][number],
): AccessLogRecord {
  if ('raw' in entry) return { kind: 'raw', raw: entry.raw }

  return {
    kind: 'request',
    method: entry.method,
    path: entry.path,
    status: entry.status,
    durationMs: entry.duration_ms,
    requestBody: entry.request_body,
    responseBody: entry.response_body,
  }
}

export async function fetchAccessLogs(
  filters: AccessLogFilters = {},
): Promise<AccessLogRecord[]> {
  try {
    const payload = await getAccessLogsGetAccessLogsGet(normalizeAccessLogFilters(filters))
    return parseGeneratedResponse(
      accessLogsResponseSchema,
      payload,
      'GET /get_access_logs',
    ).entries.map(mapAccessLogRecord)
  } catch (error) {
    throw toOrvalRequestError(error, 'Get access logs')
  }
}
