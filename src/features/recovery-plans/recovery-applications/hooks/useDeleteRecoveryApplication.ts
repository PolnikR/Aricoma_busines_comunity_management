import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'
import { getEligiblePlatformProviders } from '../utils/eligibleProviders'
import { deleteRecoveryApplication } from '../api/recoveryApplicationsApi'
import { recoveryApplicationsQueryKey } from '../api/recoveryApplicationQueryKeys'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import type { RollbackReport } from '../api/schemas/recoveryApplicationsSchema'

export class RecoveryApplicationsError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'RecoveryApplicationsError'
  }
}

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()
  const { data: providers = [] } = useProviders()
  const { data: platformProviders = [] } = usePlatformProviders()

  return useMutation({
    mutationFn: async (app: RecoveryApplicationListItem): Promise<{ applications: any[]; rollback: RollbackReport | null }> => {
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

      return deleteRecoveryApplication({
        recoveryAppId: app.id,
        rollbackFromOrchestrator: true,
        providerId: airflowProviders[0]!.id,
        computeProviderId: targetProviders[0]!.id,
      })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(recoveryApplicationsQueryKey, result.applications)
    },
  })
}
