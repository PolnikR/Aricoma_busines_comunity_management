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

// The recovery app stores only its SOURCE compute provider; the backend's default
// compute_provider_id (application.source_provider_id) is therefore the wrong end
// for a rollback or inventory, which act on the TARGET. Until the app stores its
// target provider, the VMware target is the one provider whose Airflow connection
// is the app's target_connection - never a guess between several.
export function resolveTargetComputeProviderId(
  targetConnection: string | undefined,
  providers: ProviderRecord[],
): string {
  const matches = targetConnection
    ? getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
      .filter(provider => provider.orchestratorConnId === targetConnection)
    : []
  const [match, ...others] = matches
  if (!match) {
    throw new RecoveryApplicationsError(
      'missing_compute_provider',
      `No target VMWARE provider uses the application's target connection "${targetConnection ?? ''}".`,
    )
  }
  if (others.length > 0) {
    throw new RecoveryApplicationsError(
      'ambiguous_compute_provider',
      `Several target VMWARE providers use the application's target connection "${targetConnection ?? ''}": `
        + `${matches.map(provider => provider.id).join(', ')}.`,
    )
  }
  return match.id
}

export function resolveRollbackProviderIds(
  app: RecoveryApplicationListItem,
  providers: ProviderRecord[],
): { providerId: string; computeProviderId: string } {
  if (app.data.application.platform.toUpperCase() === 'IBM_POWER') {
    throw new RecoveryApplicationsError(
      'ibm_power_rollback_unsupported',
      'IBM Power rollback is not available: the recovery application does not store its target IBM Power provider.',
    )
  }

  const providerId = app.orchestrationProviderId?.trim()
  if (!providerId) {
    throw new RecoveryApplicationsError(
      'missing_orchestration_provider',
      'The recovery application has no orchestration provider assigned.',
    )
  }

  return {
    providerId,
    computeProviderId: resolveTargetComputeProviderId(app.data.application.target_connection, providers),
  }
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
