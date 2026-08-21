import { useQueries } from '@tanstack/react-query'
import type { Query } from '@tanstack/react-query'
import { ACTIVE_RUN_INTERVAL_MS, STANDARD_REFETCH_INTERVAL_MS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { isNonTerminalRunStatus } from '../helpers/runStatus'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratedEntity, OrchestratorRun, OrchestratorRunsPage } from '../model/recoveryRunTypes'

function latestRunFromQuery(query: Query<OrchestratorRunsPage>) {
  return query.state.data?.runs[0]
}

function latestRunStaleTime(query: Query<OrchestratorRunsPage>): number {
  const latestRun = latestRunFromQuery(query)
  return latestRun && isNonTerminalRunStatus(latestRun.status)
    ? ACTIVE_RUN_INTERVAL_MS
    : STANDARD_STALE_TIME_MS
}

function latestRunRefetchInterval(query: Query<OrchestratorRunsPage>): number {
  const latestRun = latestRunFromQuery(query)
  return latestRun && isNonTerminalRunStatus(latestRun.status)
    ? ACTIVE_RUN_INTERVAL_MS
    : STANDARD_REFETCH_INTERVAL_MS
}

export interface EntityLatestRun {
  entity: OrchestratedEntity
  latestRun: OrchestratorRun | null
  isLoading: boolean
}

// One cheap (limit=1) query per orchestrated entity, reading providerId off
// each entity instead of a single shared value — Recovery Groups carry their
// own orchestrationProviderId, Applications currently share one (see
// useOrchestratedApps).
export function useOrchestratedEntityRuns(entities: OrchestratedEntity[]): EntityLatestRun[] {
  const results = useQueries({
    queries: entities.map(entity => ({
      queryKey: recoveryRunsKeys.latest(entity.providerId, entity.dagId),
      queryFn: () => fetchOrchestratorRuns(entity.providerId, entity.dagId, { limit: 1, orderBy: '-logical_date' }),
      staleTime: latestRunStaleTime,
      refetchInterval: latestRunRefetchInterval,
    })),
  })

  return entities.map((entity, index) => ({
    entity,
    latestRun: results[index]?.data?.runs[0] ?? null,
    isLoading: results[index]?.isLoading ?? false,
  }))
}
