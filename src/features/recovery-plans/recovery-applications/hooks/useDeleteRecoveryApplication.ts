import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { deleteRecoveryApp, getGetRecoveryAppsQueryKey } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryAppsResponseOutput } from '@/generated/query/zod'
import { mapRecoveryApplications } from '../helpers/mapRecoveryApplications'
import type { RecoveryApplicationListItem, RollbackReport } from '../model/recoveryApplicationTypes'

export class RecoveryApplicationsError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'RecoveryApplicationsError'
  }
}

export function resolveRollbackProviderIds(
  app: RecoveryApplicationListItem,
  providers: ProviderRecord[],
): { providerId: string; computeProviderId: string } {
  const providerId = app.orchestrationProviderId?.trim()
  if (!providerId) {
    throw new RecoveryApplicationsError(
      'missing_orchestration_provider',
      'The recovery application has no orchestration provider assigned.',
    )
  }

  const targetProviders = getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
  const computeProvider = targetProviders[0]
  if (!computeProvider) {
    throw new RecoveryApplicationsError(
      'missing_compute_provider',
      'No target VMWARE provider available for rollback.',
    )
  }

  return { providerId, computeProviderId: computeProvider.id }
}

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()
  const { data: providers = [] } = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })

  return useMutation({
    mutationFn: async (app: RecoveryApplicationListItem): Promise<{ applications: RecoveryApplicationListItem[]; rollback: RollbackReport | null }> => {
      let params: Parameters<typeof deleteRecoveryApp>[0] = { recovery_app_id: app.id, rollback_from_orchestrator: false }
      if (app.pushToOrchestrator) {
        const { providerId, computeProviderId } = resolveRollbackProviderIds(app, providers)
        params = {
          recovery_app_id: app.id,
          rollback_from_orchestrator: true,
          provider_id: providerId,
          compute_provider_id: computeProviderId,
        }
      }
      // validatingMutator returns the parsed Output shape.
      const response = await deleteRecoveryApp(params) as RecoveryAppsResponseOutput
      return {
        applications: mapRecoveryApplications(response),
        rollback: app.pushToOrchestrator ? response.rollback ?? null : null,
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getGetRecoveryAppsQueryKey() })
    },
  })
}
