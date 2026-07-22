import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecoveryApplications,
  fetchRecoveryApplication,
  createRecoveryApplication,
  updateRecoveryApplication,
  deleteRecoveryApplication,
} from '../helpers/recoveryApplicationApi'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

export const recoveryApplicationsQueryKey = ['recovery-applications'] as const
export const recoveryApplicationQueryKey = (id: string) => ['recovery-applications', id] as const

export function useRecoveryApplications() {
  return useQuery({
    queryKey: recoveryApplicationsQueryKey,
    queryFn: fetchRecoveryApplications,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecoveryApplication(id: string) {
  return useQuery({
    queryKey: recoveryApplicationQueryKey(id),
    queryFn: () => fetchRecoveryApplication(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  })
}

export function useCreateRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecoveryApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}

export function useUpdateRecoveryApplication(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecoveryApplicationData) => updateRecoveryApplication(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationQueryKey(id) })
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecoveryApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}
