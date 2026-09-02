import { useQuery } from '@tanstack/react-query'
import { fetchAccessLogs } from '../api/accessLogsApi'
import { accessLogKeys, normalizeAccessLogFilters } from '../api/accessLogQueryKeys'
import type { AccessLogFilters } from '../model/accessLogTypes'

export function useAccessLogs(filters: AccessLogFilters = {}) {
  const normalizedFilters = normalizeAccessLogFilters(filters)
  const query = useQuery({
    queryKey: accessLogKeys.list(normalizedFilters),
    queryFn: () => fetchAccessLogs(normalizedFilters),
  })

  return {
    ...query,
    isBackgroundFetching: query.isFetching && Boolean(query.data),
  }
}
