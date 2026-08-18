import { useQueries } from '@tanstack/react-query'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratedApp, OrchestratorRun } from '../model/recoveryRunTypes'

const LATEST_RUN_STALE_TIME_MS = 60 * 1000
const LATEST_RUN_GC_TIME_MS = 5 * 60 * 1000

export interface AppLatestRun {
  app: OrchestratedApp
  latestRun: OrchestratorRun | null
  isLoading: boolean
}

// One cheap (limit=1) query per orchestrated app — never per all recovery
// applications. Mirrors the per-item useQueries shape already established by
// useRecoveryGroupRelatedVolumes.ts.
export function useOrchestratedAppRuns(apps: OrchestratedApp[], providerId: string | null): AppLatestRun[] {
  const enabled = Boolean(providerId)

  const results = useQueries({
    queries: apps.map(app => ({
      queryKey: recoveryRunsKeys.latest(providerId, app.dagId),
      queryFn: () => fetchOrchestratorRuns(providerId ?? '', app.dagId, { limit: 1, orderBy: '-logical_date' }),
      enabled,
      staleTime: LATEST_RUN_STALE_TIME_MS,
      gcTime: LATEST_RUN_GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  })

  return apps.map((app, index) => ({
    app,
    latestRun: results[index]?.data?.runs[0] ?? null,
    isLoading: enabled && (results[index]?.isLoading ?? false),
  }))
}
