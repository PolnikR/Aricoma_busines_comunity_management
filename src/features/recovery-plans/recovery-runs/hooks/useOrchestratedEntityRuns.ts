import { useQueries } from '@tanstack/react-query'
import { RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { LatestRunRequestState, OrchestratedEntity } from '../model/recoveryRunTypes'

export interface EntityLatestRun {
  entity: OrchestratedEntity
  latestRunState: LatestRunRequestState
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
    })),
  })

  const getLatestRunState = (index: number): LatestRunRequestState => {
    const result = results[index]
    if (!result || result.isLoading) return { status: 'loading' }

    const error = result.error instanceof Error ? result.error : null
    const latestRun = result.data?.runs[0]
    if (latestRun) return { status: 'data', run: latestRun, refreshError: error }
    if (result.data) return { status: 'empty', refreshError: error }
    if (error) return { status: 'error', error }
    return { status: 'empty', refreshError: null }
  }

  return {
    rows: entities.map((entity, index) => ({
      entity,
      latestRunState: getLatestRunState(index),
    })),
    isFetching: results.some(result => result.isFetching),
    refetch: () => Promise.all(results.map(result => result.refetch())),
  }
}
