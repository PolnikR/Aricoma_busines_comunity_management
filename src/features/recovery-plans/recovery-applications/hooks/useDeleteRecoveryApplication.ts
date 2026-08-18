import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'
import { getEligiblePlatformProviders } from '../utils/eligibleProviders'
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

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()
  const { data: providers = [] } = useProviders()
  const { data: platformProviders = [] } = usePlatformProviders()

  return useMutation({
    mutationFn: async (app: RecoveryApplicationListItem): Promise<{ applications: RecoveryApplicationListItem[]; rollback: RollbackReport | null }> => {
      if (!app.pushToOrchestrator) {
        return deleteRecoveryApplication({
          recoveryAppId: app.id,
          rollbackFromOrchestrator: false,
        })
      }

      const airflowProviders = getEligiblePlatformProviders(platformProviders)
      if (airflowProviders.length !== 1) {
        throw new RecoveryApplicationsError(
          'missing_orchestration_provider',
          airflowProviders.length === 0
            ? 'No AIRFLOW provider available for rollback.'
            : 'Multiple AIRFLOW providers found; cannot auto-select one.',
        )
      }

      const targetProviders = getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
      if (targetProviders.length !== 1) {
        throw new RecoveryApplicationsError(
          'missing_compute_provider',
          targetProviders.length === 0
            ? 'No target VMWARE provider available for rollback.'
            : 'Multiple target VMWARE providers found; cannot auto-select one.',
        )
      }

      const airflowProvider = airflowProviders.at(0)
      const computeProvider = targetProviders.at(0)
      if (!airflowProvider || !computeProvider) {
        throw new RecoveryApplicationsError(
          'unexpected_error',
          'Provider resolution failed unexpectedly.',
        )
      }

      return deleteRecoveryApplication({
        recoveryAppId: app.id,
        rollbackFromOrchestrator: true,
        providerId: airflowProvider.id,
        computeProviderId: computeProvider.id,
      })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(recoveryApplicationsQueryKey, result.applications)
    },
  })
}
