import { useQueries } from '@tanstack/react-query'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratedEntity, OrchestratorRun } from '../model/recoveryRunTypes'

const LATEST_RUN_STALE_TIME_MS = 60 * 1000
const LATEST_RUN_GC_TIME_MS = 5 * 60 * 1000

export interface EntityLatestRun {
  entity: OrchestratedEntity
  latestRun: OrchestratorRun | null
  isLoading: boolean
}

// One cheap (limit=1) query per orchestrated entity, reading providerId off
// each entity instead of a single shared value — Recovery Groups carry their
// own orchestrationProviderId, Applications currently share one (see
// useOrchestratedApps). Generalized version of useOrchestratedAppRuns.
export function useOrchestratedEntityRuns(entities: OrchestratedEntity[]): EntityLatestRun[] {
  const results = useQueries({
    queries: entities.map(entity => ({
      queryKey: recoveryRunsKeys.latest(entity.providerId, entity.dagId),
      queryFn: () => fetchOrchestratorRuns(entity.providerId, entity.dagId, { limit: 1, orderBy: '-logical_date' }),
      staleTime: LATEST_RUN_STALE_TIME_MS,
      gcTime: LATEST_RUN_GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  })

  return entities.map((entity, index) => ({
    entity,
    latestRun: results[index]?.data?.runs[0] ?? null,
    isLoading: results[index]?.isLoading ?? false,
  }))
}
