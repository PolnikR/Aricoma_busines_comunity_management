import { useQuery } from '@tanstack/react-query'
import { ACTIVE_RUN_INTERVAL_MS, STANDARD_REFETCH_INTERVAL_MS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { isNonTerminalRunStatus } from '../helpers/runStatus'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratorRun } from '../model/recoveryRunTypes'

// Single-entity latest-run lookup for detail panels (e.g. an Application or
// Recovery Group's DetailDrawer) — deliberately not a useQueries fan-out like
// useOrchestratedEntityRuns, since a detail panel only ever needs one entity's
// status, not every orchestrated entity's.
export function useLatestOrchestratorRun(providerId: string | null, dagId: string | null) {
  const enabled = Boolean(providerId) && Boolean(dagId)

  const query = useQuery({
    queryKey: recoveryRunsKeys.latest(providerId, dagId ?? ''),
    queryFn: () => fetchOrchestratorRuns(providerId ?? '', dagId ?? '', { limit: 1, orderBy: '-logical_date' }),
    enabled,
    staleTime: query => {
      const latestRun = query.state.data?.runs[0]
      return latestRun && isNonTerminalRunStatus(latestRun.status)
        ? ACTIVE_RUN_INTERVAL_MS
        : STANDARD_STALE_TIME_MS
    },
    refetchInterval: query => {
      const latestRun = query.state.data?.runs[0]
      return latestRun && isNonTerminalRunStatus(latestRun.status)
        ? ACTIVE_RUN_INTERVAL_MS
        : STANDARD_REFETCH_INTERVAL_MS
    },
  })

  const latestRun: OrchestratorRun | null = query.data?.runs[0] ?? null

  return {
    latestRun,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  }
}
