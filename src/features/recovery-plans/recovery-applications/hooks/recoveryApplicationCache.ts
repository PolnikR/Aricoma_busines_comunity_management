import type { QueryClient, QueryFilters } from '@tanstack/react-query'
import { normalizeAirflowDagId } from '@/config/externalServices'
import { getGetRecoveryAppInventoryQueryKey, getGetRecoveryAppsQueryKey } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { getGetOrchestratorRunsQueryKey } from '@/generated/query/operations/operations.gen'
import type { RecoveryAppsResponseOutput } from '@/generated/query/zod'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined
}

// Keep raw responses in the shared query cache: list observers apply their own select.
// Mutation settlement belongs here so it also runs after the initiating page unmounts.
export async function reconcileRecoveryApplications(
  queryClient: QueryClient,
  response?: RecoveryAppsResponseOutput,
  applications: RecoveryApplicationListItem[] = [],
) {
  const listKey = getGetRecoveryAppsQueryKey()
  await queryClient.cancelQueries({ queryKey: listKey })
  if (response) queryClient.setQueryData(listKey, response)
  const refresh = async (filters: QueryFilters) => {
    await queryClient.invalidateQueries({ ...filters, refetchType: 'none' })
    // A Create page may seed this cache before any list observer has registered a GET.
    // Refetch mounted and unmounted observers, but do not retry a missing query function.
    await queryClient.refetchQueries({
      ...filters,
      type: 'all',
      predicate: query => typeof query.options.queryFn === 'function' && (!filters.predicate || filters.predicate(query)),
    })
  }
  const refreshes = [refresh({ queryKey: listKey })]
  if (applications.length) {
    const inventoryFilters = {
      queryKey: getGetRecoveryAppInventoryQueryKey(),
      predicate: (query: { queryKey: readonly unknown[]; state: { data: unknown } }) => {
        const params = record(query.queryKey[1])
        return applications.some(application => record(query.state.data)?.['recovery_app_id'] === application.id
          || Boolean(application.airflowRunId && params?.['run_id'] === application.airflowRunId))
      },
    }
    const runsFilters = {
      queryKey: getGetOrchestratorRunsQueryKey(),
      predicate: (query: { queryKey: readonly unknown[] }) => {
        const params = record(query.queryKey[1])
        return applications.some(application => Boolean(application.airflowRunId && application.orchestrationProviderId
          && params?.['provider_id'] === application.orchestrationProviderId
          && params['dag_id'] === normalizeAirflowDagId(application.airflowRunId)))
      },
    }
    refreshes.push(
      queryClient.cancelQueries(inventoryFilters).then(() => refresh(inventoryFilters)),
      queryClient.cancelQueries(runsFilters).then(() => refresh(runsFilters)),
    )
  }
  // A failed GET must not convert a successful persistence/rollback into a failed mutation.
  await Promise.allSettled(refreshes)
}
