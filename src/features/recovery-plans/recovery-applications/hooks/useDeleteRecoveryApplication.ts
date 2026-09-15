import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { deleteRecoveryApplication } from '../api/recoveryApplicationsApi'
import { recoveryApplicationsQueryKey } from '../api/recoveryApplicationQueryKeys'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import type { RollbackReport } from '../api/schemas/recoveryApplicationsSchema'

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
  const { data: providers = [] } = useProviders()

  return useMutation({
    mutationFn: async (app: RecoveryApplicationListItem): Promise<{ applications: RecoveryApplicationListItem[]; rollback: RollbackReport | null }> => {
      if (!app.pushToOrchestrator) {
        return deleteRecoveryApplication({
          recoveryAppId: app.id,
          rollbackFromOrchestrator: false,
        })
      }

      const { providerId, computeProviderId } = resolveRollbackProviderIds(app, providers)

      return deleteRecoveryApplication({
        recoveryAppId: app.id,
        rollbackFromOrchestrator: true,
        providerId,
        computeProviderId,
      })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(recoveryApplicationsQueryKey, result.applications)
    },
  })
}
