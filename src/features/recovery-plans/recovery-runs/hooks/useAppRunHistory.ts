import { useQuery } from '@tanstack/react-query'
import type { Query } from '@tanstack/react-query'
import { ACTIVE_RUN_INTERVAL_MS, RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { isNonTerminalRunStatus } from '../helpers/runStatus'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratorRunsPage } from '../model/recoveryRunTypes'

interface UseAppRunHistoryOptions {
  providerId: string | null
  dagId: string | null
  page: number
  pageSize: number
}

const EMPTY_PAGE: OrchestratorRunsPage = { runs: [], total: 0 }

function shouldFastPollHistory(query: Pick<Query<OrchestratorRunsPage>, 'state'>, page: number): boolean {
  if (page !== 1) return false

  const newestRun = query.state.data?.runs[0]
  return Boolean(newestRun && isNonTerminalRunStatus(newestRun.status))
}

// Full paginated run history for exactly one app — only fetched once a
// drawer is actually opened for that app, never upfront for every app.
export function useAppRunHistory({ providerId, dagId, page, pageSize }: UseAppRunHistoryOptions) {
  const enabled = Boolean(providerId) && Boolean(dagId)

  const query = useQuery({
    queryKey: recoveryRunsKeys.history(providerId, dagId ?? '', page, pageSize),
    queryFn: () => fetchOrchestratorRuns(providerId ?? '', dagId ?? '', {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: '-logical_date',
    }),
    enabled,
    staleTime: query => shouldFastPollHistory(query, page) ? ACTIVE_RUN_INTERVAL_MS : RECOVERY_RUNS_INTERVAL_MS,
    refetchInterval: query => shouldFastPollHistory(query, page) ? ACTIVE_RUN_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  })

  return {
    data: query.data ?? EMPTY_PAGE,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  }
}
