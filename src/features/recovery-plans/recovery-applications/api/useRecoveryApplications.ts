import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecoveryApplications,
  submitRecoveryApplicationDag,
} from './recoveryApplicationsApi'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

export const recoveryApplicationsQueryKey = ['recovery-applications'] as const

export interface SubmitRecoveryApplicationInput {
  fileName: string
  data: RecoveryApplicationData
}

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
