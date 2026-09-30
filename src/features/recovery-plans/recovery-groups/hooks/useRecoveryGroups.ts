import { useCallback } from 'react'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import {
  useDeleteRecoveryGroup,
  useGetRecoveryGroups,
  useRollbackGroupFromOrchestrator,
  useSubmitRecoveryGroup,
} from '@/generated/query/recovery-groups/recovery-groups.gen'
import type { RecoveryGroupsResponse, RecoveryGroupsResponseOutput } from '@/generated/query/zod'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { toProgrammaticId } from '@/shared/utils/programmaticId'
import {
  mapRecoveryGroupApiRecord,
  toRecoveryGroup,
  toRecoveryGroupReadRecord,
  toRecoveryGroupSubmitPayload,
} from '../helpers/mapRecoveryGroups'
import type { RecoveryGroup, RecoveryGroupDraft, RollbackReport } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from '../api/recoveryGroupsErrors'
import { validateRecoveryGroupDraft } from '../api/recoveryGroupsValidation'
import { getRecoveryGroupTopologyError } from '../utils/recoveryGroupTopology'

function toRecoveryGroups(response: RecoveryGroupsResponse, providers: ProviderRecord[]): RecoveryGroup[] {
  // validatingMutator hands select the parsed Output shape.
  return (response as RecoveryGroupsResponseOutput).recovery_groups
    .map(record => mapRecoveryGroupApiRecord(toRecoveryGroupReadRecord(record), providers))
}

function requireRollback(response: RecoveryGroupsResponse, operation: string): RollbackReport {
  const { rollback } = response as RecoveryGroupsResponseOutput
  if (!rollback) throw new Error(`${operation} response is missing rollback details`)
  return rollback
}

// Recovery group list and mutations for the pages. The list depends on the
// providers (workload type and provider resolution), so its select is rebuilt
// when the provider set changes.
export function useRecoveryGroups() {
  const providerQuery = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const providers = providerQuery.data
  const selectGroups = useCallback(
    (response: RecoveryGroupsResponse) => toRecoveryGroups(response, providers ?? []),
    [providers],
  )
  const query = useGetRecoveryGroups({
    query: { select: selectGroups, enabled: providerQuery.isSuccess, retry: false },
  })

  const createMutation = useSubmitRecoveryGroup()
  const updateMutation = useSubmitRecoveryGroup()
  const deleteMutation = useDeleteRecoveryGroup()
  const rollbackMutation = useRollbackGroupFromOrchestrator()

  const submit = async (
    mutation: typeof createMutation,
    draft: RecoveryGroupDraft,
    requestedId?: string,
  ): Promise<RecoveryGroup> => {
    const validated = validateRecoveryGroupDraft(draft)
    const id = toProgrammaticId(requestedId ?? validated.id)
    if (!id) throw new RecoveryGroupsError('invalid_draft', 'Recovery group ID is required')
    if (!providerQuery.isSuccess || providerQuery.isFetching || !providers) {
      throw new RecoveryGroupsError('invalid_draft', 'Providers are unavailable')
    }
    const existing = requestedId === undefined ? undefined : query.data?.find(group => group.id === id)
    const allowLegacyLocal = existing?.topology === 'local'
      && existing.resourceType === 'vm'
      && !existing.relatedVolumeProviderId
      && existing.relatedVolumes.length === 0
      && validated.configuration.resourceType === 'vm'
      && !validated.relatedVolumeProviderId
      && validated.relatedVolumes.length === 0
    const topologyError = getRecoveryGroupTopologyError({
      topology: validated.topology,
      relatedVolumeProviderId: validated.configuration.resourceType === 'vm'
        ? validated.relatedVolumeProviderId
        : validated.providerId,
      metroMirrorMode: validated.metroMirrorMode,
      consistencyGroupId: validated.consistencyGroupId,
    }, providers, allowLegacyLocal)
    if (topologyError) {
      throw new RecoveryGroupsError('invalid_draft', `Recovery group topology is invalid: ${topologyError}`)
    }
    const response = await mutation.mutateAsync({
      data: toRecoveryGroupSubmitPayload(validated, id),
      params: {
        provider_id: validated.orchestrationProviderId,
        push_to_orchestrator: validated.pushToOrchestrator,
      },
    })
    const returnedRecord = (response as RecoveryGroupsResponseOutput).recovery_groups
      .find(record => record.id === id)
    return returnedRecord
      ? mapRecoveryGroupApiRecord(toRecoveryGroupReadRecord(returnedRecord), providers)
      : toRecoveryGroup(validated, id)
  }

  const remove = async (group: RecoveryGroup): Promise<RollbackReport | null> => {
    if (!group.pushToOrchestrator) {
      await deleteMutation.mutateAsync({ params: { recovery_group_id: group.id, rollback_from_orchestrator: false } })
      return null
    }
    const providerId = group.orchestrationProviderId?.trim()
    if (!providerId) {
      throw new RecoveryGroupsError(
        'missing_orchestration_provider',
        'An orchestration provider is required to roll back this recovery group',
      )
    }
    const response = await deleteMutation.mutateAsync({
      params: { recovery_group_id: group.id, rollback_from_orchestrator: true, provider_id: providerId },
    })
    return requireRollback(response, 'DELETE /delete_recovery_group')
  }

  const rollback = async (groupId: string, providerId: string): Promise<RollbackReport> => {
    const response = await rollbackMutation.mutateAsync({
      params: { recovery_group_id: groupId, provider_id: providerId },
    })
    return requireRollback(response, 'POST /rollback_group_from_orchestrator')
  }

  return {
    groups: query.data ?? [],
    isLoading: providerQuery.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: providerQuery.error ?? query.error,
    refresh: providerQuery.isSuccess ? query.refetch : providerQuery.refetch,
    create: (draft: RecoveryGroupDraft) => submit(createMutation, draft),
    update: (id: string, draft: RecoveryGroupDraft) => submit(updateMutation, draft, id),
    remove,
    rollback,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRollingBack: rollbackMutation.isPending,
    mutationError: createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? rollbackMutation.error,
  }
}
