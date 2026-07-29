import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecoveryApplications,
  submitRecoveryApplicationDag,
} from '../api/recoveryApplicationsApi'
import { recoveryApplicationsQueryKey } from '../api/recoveryApplicationQueryKeys'
import type { SubmitRecoveryApplicationInput } from '../model/recoveryApplicationTypes'

export function useRecoveryApplications() {
  return useQuery({
    queryKey: recoveryApplicationsQueryKey,
    queryFn: fetchRecoveryApplications,
  })
}

export function useSubmitRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileName, data }: SubmitRecoveryApplicationInput) => (
      submitRecoveryApplicationDag(fileName, data, false)
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}
