import { useMutation, useQueryClient } from '@tanstack/react-query'
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

// Rollback and inventory act on the TARGET compute provider (a VMware target
// vCenter or the IBM Power provider holding the target LPARs). The backend
// would default to the stored target too, but a legacy record without one must
// fail here instead of reaching the backend without a target.
export function targetComputeProviderIdOf(app: RecoveryApplicationListItem): string {
  const targetProviderId = app.data.application.target_provider_id
  if (!targetProviderId) {
    throw new RecoveryApplicationsError(
      'missing_compute_provider',
      'The recovery application has no target provider stored; edit and save it to select one.',
    )
  }
  return targetProviderId
}

export function resolveRollbackProviderIds(
  app: RecoveryApplicationListItem,
): { providerId: string; computeProviderId: string } {
  const providerId = app.orchestrationProviderId?.trim()
  if (!providerId) {
    throw new RecoveryApplicationsError(
      'missing_orchestration_provider',
      'The recovery application has no orchestration provider assigned.',
    )
  }

  return {
    providerId,
    computeProviderId: targetComputeProviderIdOf(app),
  }
}

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (app: RecoveryApplicationListItem): Promise<{ applications: RecoveryApplicationListItem[]; rollback: RollbackReport | null }> => {
      let params: Parameters<typeof deleteRecoveryApp>[0] = { recovery_app_id: app.id, rollback_from_orchestrator: false }
      if (app.pushToOrchestrator) {
        const { providerId, computeProviderId } = resolveRollbackProviderIds(app)
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
