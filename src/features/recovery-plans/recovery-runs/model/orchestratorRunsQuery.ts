import type { OrchestratorRunsResponse } from '@/generated/query/zod'
import { mapOrchestratorRuns } from '../helpers/mapOrchestratorRuns'
import type { OrchestratorRun, OrchestratorRunsPage } from './recoveryRunTypes'

export const RUNS_ORDER_BY = '-logical_date'

// dagId must be the constructed `dag_${airflow_run_id}` value, not the
// recovery app's own id — see useOrchestratedApps. Detail panels and the
// overview share these params, so they share one cache entry per entity.
export const latestRunParams = (providerId: string, dagId: string) => ({
  provider_id: providerId,
  dag_id: dagId,
  limit: 1,
  order_by: RUNS_ORDER_BY,
})

// validatingMutator keeps the unlisted Airflow keys the mapper reads.
export const selectOrchestratorRuns = (response: OrchestratorRunsResponse): OrchestratorRunsPage =>
  mapOrchestratorRuns(response)

// Polling callbacks see the cached wire response, not the selected page.
export const newestRunOf = (response: OrchestratorRunsResponse | undefined): OrchestratorRun | undefined =>
  response ? selectOrchestratorRuns(response).runs[0] : undefined
