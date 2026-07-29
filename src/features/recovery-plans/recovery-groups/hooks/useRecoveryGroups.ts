import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  fetchRecoveryGroups,
  updateRecoveryGroup,
} from '../api/recoveryGroupsApi'
import { recoveryGroupKeys } from '../api/recoveryGroupQueryKeys'
import { RECOVERY_GROUPS_STORAGE_KEY } from '../api/recoveryGroupsLocalStorage'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

export function useRecoveryGroups() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: recoveryGroupKeys.list(),
    queryFn: fetchRecoveryGroups,
    retry: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === RECOVERY_GROUPS_STORAGE_KEY) {
        void queryClient.invalidateQueries({ queryKey: recoveryGroupKeys.list() })
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => { window.removeEventListener('storage', handleStorage) }
  }, [queryClient])

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
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    create: createMutation.mutateAsync,
    update: (id: string, draft: RecoveryGroupDraft) => updateMutation.mutateAsync({ id, draft }),
    remove: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    mutationError: createMutation.error ?? updateMutation.error ?? deleteMutation.error,
  }
}
