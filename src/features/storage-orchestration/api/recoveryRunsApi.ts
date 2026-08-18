import { getOrchestratorRunsGetOrchestratorRunsGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { mapOrchestratorRuns } from '../helpers/mapOrchestratorRuns'
import type { OrchestratorRunsPage } from '../model/recoveryRunTypes'

export interface FetchOrchestratorRunsOptions {
  limit?: number
  offset?: number
  orderBy?: string
}

// dagId must be the constructed `dag_${airflow_run_id}` value, not the
// recovery app's own id — see useOrchestratedApps.
export async function fetchOrchestratorRuns(
  providerId: string,
  dagId: string,
  options: FetchOrchestratorRunsOptions = {},
): Promise<OrchestratorRunsPage> {
  try {
    const response = await getOrchestratorRunsGetOrchestratorRunsGet({
      provider_id: providerId,
      dag_id: dagId,
      ...(options.limit !== undefined ? { limit: options.limit } : {}),
      ...(options.offset !== undefined ? { offset: options.offset } : {}),
      ...(options.orderBy !== undefined ? { order_by: options.orderBy } : {}),
    })
    return mapOrchestratorRuns(response)
  } catch (error) {
    if (error instanceof OrvalApiError) {
      const reason = error.statusText || String(error.status)
      throw new Error(`Failed to fetch orchestrator runs: ${reason}`, { cause: error })
    }
    throw error
  }
}
