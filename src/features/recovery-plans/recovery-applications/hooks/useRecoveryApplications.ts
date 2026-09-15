import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecoveryApplications,
  fetchRecoveryApplicationInventory,
  submitRecoveryApplicationDag,
} from '../api/recoveryApplicationsApi'
import { recoveryApplicationInventoryQueryKey, recoveryApplicationsQueryKey } from '../api/recoveryApplicationQueryKeys'
import type { SubmitRecoveryApplicationInput } from '../model/recoveryApplicationTypes'

export function useRecoveryApplications() {
  return useQuery({
    queryKey: recoveryApplicationsQueryKey,
    queryFn: fetchRecoveryApplications,
  })
}

export function useRecoveryApplicationInventory(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: recoveryApplicationInventoryQueryKey(runId ?? ''),
    queryFn: () => fetchRecoveryApplicationInventory(runId ?? ''),
    enabled: enabled && Boolean(runId),
  })
}

export function useSubmitRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ providerId, data, pushToOrchestrator }: SubmitRecoveryApplicationInput) => (
      submitRecoveryApplicationDag(providerId, data, pushToOrchestrator)
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}
