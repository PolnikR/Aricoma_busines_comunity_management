import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  fetchRecoveryGroups,
  updateRecoveryGroup,
} from '../api/recoveryGroupsApi'
import { recoveryGroupKeys } from '../api/recoveryGroupQueryKeys'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

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
    refetchOnWindowFocus: false,
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
    mutationFn: deleteRecoveryGroup,
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
    remove: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    mutationError: createMutation.error ?? updateMutation.error ?? deleteMutation.error,
  }
}
