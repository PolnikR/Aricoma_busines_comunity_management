import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteRecoveryApplication } from '../api/recoveryApplicationsApi'
import { recoveryApplicationsQueryKey } from '../api/recoveryApplicationQueryKeys'

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecoveryApplication,
    onSuccess: applications =>
      queryClient.setQueryData(recoveryApplicationsQueryKey, applications),
  })
}
