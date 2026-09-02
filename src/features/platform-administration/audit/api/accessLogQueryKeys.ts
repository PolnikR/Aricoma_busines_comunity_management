import type { AccessLogFilters } from '../model/accessLogTypes'

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

export const accessLogKeys = {
  all: ['access-logs'] as const,
  list: (filters: AccessLogFilters = {}) => {
    const normalized = normalizeAccessLogFilters(filters)
    return [
      ...accessLogKeys.all,
      'list',
      normalized.lines,
      normalized.status ?? null,
      normalized.method ?? null,
      normalized.pathContains ?? null,
    ] as const
  },
}
