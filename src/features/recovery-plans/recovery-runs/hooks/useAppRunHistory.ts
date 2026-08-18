import { useQuery } from '@tanstack/react-query'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { recoveryRunsKeys } from '../api/recoveryRunsQueryKeys'
import type { OrchestratorRunsPage } from '../model/recoveryRunTypes'

interface UseAppRunHistoryOptions {
  providerId: string | null
  dagId: string | null
  page: number
  pageSize: number
}

const EMPTY_PAGE: OrchestratorRunsPage = { runs: [], total: 0 }

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
    refetchOnWindowFocus: false,
    retry: 1,
  })

  return {
    data: query.data ?? EMPTY_PAGE,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  }
}
