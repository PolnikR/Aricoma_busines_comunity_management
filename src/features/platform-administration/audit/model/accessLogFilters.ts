import type { GetAccessLogsParams } from '@/generated/query/zod'
import type { AccessLogFilters } from './accessLogTypes'

export const DEFAULT_ACCESS_LOG_LINES = 200
export const MIN_ACCESS_LOG_LINES = 1
export const MAX_ACCESS_LOG_LINES = 5000

export interface NormalizedAccessLogFilters {
  lines: number
  status?: number
  method?: string
  pathContains?: string
}

function normalizeInteger(value: number | undefined) {
  return Number.isInteger(value) ? value : undefined
}

function normalizeText(value: string | undefined, transform?: (text: string) => string) {
  const trimmed = value?.trim()
  return trimmed ? transform?.(trimmed) ?? trimmed : undefined
}

export function normalizeAccessLogFilters(
  filters: AccessLogFilters = {},
): NormalizedAccessLogFilters {
  const lines = normalizeInteger(filters.lines)
  const status = normalizeInteger(filters.status)
  const method = normalizeText(filters.method, text => text.toUpperCase())
  const pathContains = normalizeText(filters.pathContains)

  return {
    lines: lines && lines >= MIN_ACCESS_LOG_LINES && lines <= MAX_ACCESS_LOG_LINES
      ? lines
      : DEFAULT_ACCESS_LOG_LINES,
    ...(status !== undefined ? { status } : {}),
    ...(method ? { method } : {}),
    ...(pathContains ? { pathContains } : {}),
  }
}

// Complete, normalized request params, so equal filters always share one cache entry.
export function toAccessLogParams(filters: AccessLogFilters = {}): GetAccessLogsParams {
  const normalized = normalizeAccessLogFilters(filters)
  return {
    lines: normalized.lines,
    ...(normalized.status !== undefined ? { status: normalized.status } : {}),
    ...(normalized.method ? { method: normalized.method } : {}),
    ...(normalized.pathContains ? { path_contains: normalized.pathContains } : {}),
  }
}
