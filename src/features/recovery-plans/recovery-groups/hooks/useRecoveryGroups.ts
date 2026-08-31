import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  fetchRecoveryGroups,
  rollbackRecoveryGroupOrchestration,
  updateRecoveryGroup,
} from '../api/recoveryGroupsApi'
import { recoveryGroupKeys } from '../api/recoveryGroupQueryKeys'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from '../api/recoveryGroupsErrors'
import type { RollbackReport } from '../api/schemas/recoveryGroupsSchema'

export function useRecoveryGroups() {
  const queryClient = useQueryClient()
  const providerQuery = useProviders()
  const providers = providerQuery.data ?? []
  const providerSignature = providers
    .map(provider => `${provider.id}:${provider.type}`)
    .sort()
    .join('|')
  const query = useQuery({
    queryKey: [...recoveryGroupKeys.list(), providerSignature],
    queryFn: () => fetchRecoveryGroups(providers),
    enabled: providerQuery.isSuccess,
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: createRecoveryGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recoveryGroupKeys.list() }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: RecoveryGroupDraft }) => (
      updateRecoveryGroup(id, draft)
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recoveryGroupKeys.list() }),
  })
  const deleteMutation = useMutation({
    mutationFn: (group: RecoveryGroup) => {
      if (group.pushToOrchestrator) {
        const providerId = group.orchestrationProviderId?.trim()
        if (!providerId) {
          throw new RecoveryGroupsError(
            'missing_orchestration_provider',
            'An orchestration provider is required to roll back this recovery group',
          )
        }
        return deleteRecoveryGroup({
          recoveryGroupId: group.id,
          rollbackFromOrchestrator: true,
          providerId,
        })
      }
      return deleteRecoveryGroup({
        recoveryGroupId: group.id,
        rollbackFromOrchestrator: false,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recoveryGroupKeys.list() }),
  })
  const rollbackMutation = useMutation({
    mutationFn: ({ groupId, providerId }: { groupId: string; providerId: string }) => (
      rollbackRecoveryGroupOrchestration(groupId, providerId)
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recoveryGroupKeys.list() }),
  })

  return {
    groups: query.data ?? [],
    isLoading: providerQuery.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: providerQuery.error ?? query.error,
    refresh: providerQuery.isSuccess ? query.refetch : providerQuery.refetch,
    create: createMutation.mutateAsync,
    update: (id: string, draft: RecoveryGroupDraft) => updateMutation.mutateAsync({ id, draft }),
    remove: (group: RecoveryGroup) => deleteMutation.mutateAsync(group),
    rollback: (groupId: string, providerId: string): Promise<RollbackReport> => (
      rollbackMutation.mutateAsync({ groupId, providerId })
    ),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRollingBack: rollbackMutation.isPending,
    mutationError: createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? rollbackMutation.error,
  }
}
