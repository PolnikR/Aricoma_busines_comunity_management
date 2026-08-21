import { useQueries } from '@tanstack/react-query'
import { RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratedEntity, OrchestratorRun } from '../model/recoveryRunTypes'

export interface EntityLatestRun {
  entity: OrchestratedEntity
  latestRun: OrchestratorRun | null
  isLoading: boolean
}

export interface OrchestratedEntityRunsResult {
  rows: EntityLatestRun[]
  isFetching: boolean
  refetch: () => Promise<unknown[]>
}

// One cheap (limit=1) query per orchestrated entity, reading providerId off
// each entity instead of a single shared value — Recovery Groups carry their
// own orchestrationProviderId, Applications currently share one (see
// useOrchestratedApps).
export function useOrchestratedEntityRuns(entities: OrchestratedEntity[]): OrchestratedEntityRunsResult {
  const results = useQueries({
    queries: entities.map(entity => ({
      queryKey: recoveryRunsKeys.latest(entity.providerId, entity.dagId),
      queryFn: () => fetchOrchestratorRuns(entity.providerId, entity.dagId, { limit: 1, orderBy: '-logical_date' }),
      staleTime: RECOVERY_RUNS_INTERVAL_MS,
      refetchInterval: RECOVERY_RUNS_INTERVAL_MS,
    })),
  })

  return {
    rows: entities.map((entity, index) => ({
      entity,
      latestRun: results[index]?.data?.runs[0] ?? null,
      isLoading: results[index]?.isLoading ?? false,
    })),
    isFetching: results.some(result => result.isFetching),
    refetch: () => Promise.all(results.map(result => result.refetch())),
  }
}
