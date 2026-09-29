import { useGetOrchestratorRuns } from '@/generated/query/operations/operations.gen'
import { ACTIVE_RUN_INTERVAL_MS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { isNonTerminalRunStatus } from '../helpers/runStatus'
import { latestRunParams, newestRunOf, selectOrchestratorRuns } from '../model/orchestratorRunsQuery'
import type { OrchestratorRun } from '../model/recoveryRunTypes'

// Single-entity latest-run lookup for detail panels (e.g. an Application or
// Recovery Group's DetailDrawer) — deliberately not a useQueries fan-out like
// useOrchestratedEntityRuns, since a detail panel only ever needs one entity's
// status, not every orchestrated entity's.
export function useLatestOrchestratorRun(providerId: string | null, dagId: string | null) {
  const enabled = Boolean(providerId) && Boolean(dagId)

  const query = useGetOrchestratorRuns(latestRunParams(providerId ?? '', dagId ?? ''), {
    query: {
      select: selectOrchestratorRuns,
      enabled,
      staleTime: query => {
        const latestRun = newestRunOf(query.state.data)
        return latestRun && isNonTerminalRunStatus(latestRun.status)
          ? ACTIVE_RUN_INTERVAL_MS
          : STANDARD_STALE_TIME_MS
      },
      refetchInterval: query => {
        const latestRun = newestRunOf(query.state.data)
        return latestRun && isNonTerminalRunStatus(latestRun.status)
          ? ACTIVE_RUN_INTERVAL_MS
          : false
      },
      refetchIntervalInBackground: false,
    },
  })

  const latestRun: OrchestratorRun | null = query.data?.runs[0] ?? null

  return {
    latestRun,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  }
}
