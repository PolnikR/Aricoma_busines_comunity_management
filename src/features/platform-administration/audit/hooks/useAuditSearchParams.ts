import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  DEFAULT_ACCESS_LOG_LINES,
  normalizeAccessLogFilters,
} from '../api/accessLogQueryKeys'
import type { AccessLogFilters } from '../model/accessLogTypes'

const LINES_PARAM = 'lines'
const STATUS_PARAM = 'status'
const METHOD_PARAM = 'method'
const PATH_CONTAINS_PARAM = 'pathContains'

function parseInteger(value: string | null) {
  if (!value?.trim()) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

export function useAuditSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => {
    const lines = parseInteger(searchParams.get(LINES_PARAM))
    const status = parseInteger(searchParams.get(STATUS_PARAM))
    const method = searchParams.get(METHOD_PARAM)
    const pathContains = searchParams.get(PATH_CONTAINS_PARAM)

    return normalizeAccessLogFilters({
      ...(lines !== undefined ? { lines } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(method !== null ? { method } : {}),
      ...(pathContains !== null ? { pathContains } : {}),
    })
  }, [searchParams])

  const setFilters = (nextFilters: AccessLogFilters) => {
    const normalized = normalizeAccessLogFilters(nextFilters)
    const next = new URLSearchParams(searchParams)

    if (normalized.lines === DEFAULT_ACCESS_LOG_LINES) next.delete(LINES_PARAM)
    else next.set(LINES_PARAM, String(normalized.lines))

    if (normalized.status === undefined) next.delete(STATUS_PARAM)
    else next.set(STATUS_PARAM, String(normalized.status))

    if (normalized.method === undefined) next.delete(METHOD_PARAM)
    else next.set(METHOD_PARAM, normalized.method)

    if (normalized.pathContains === undefined) next.delete(PATH_CONTAINS_PARAM)
    else next.set(PATH_CONTAINS_PARAM, normalized.pathContains)

    setSearchParams(next, { replace: true })
  }

  return { filters, setFilters }
}
