import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecoveryApplications,
  fetchRecoveryApplication,
  createRecoveryApplication,
  updateRecoveryApplication,
  deleteRecoveryApplication,
  submitRecoveryApplicationDag,
} from '../helpers/recoveryApplicationApi'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

export const recoveryApplicationsQueryKey = ['recovery-applications'] as const
export const recoveryApplicationQueryKey = (id: string) => ['recovery-applications', id] as const

export function useRecoveryApplications() {
  return useQuery({
    queryKey: recoveryApplicationsQueryKey,
    queryFn: fetchRecoveryApplications,
  })
}

export function useRecoveryApplication(id: string) {
  return useQuery({
    queryKey: recoveryApplicationQueryKey(id),
    queryFn: () => fetchRecoveryApplication(id),
    enabled: !!id,
  })
}

export function useCreateRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecoveryApplicationData) => createRecoveryApplication(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}

// Submits the application to the Airflow DAG and, on success, stores it
// locally so it appears in the applications list.
export function useSubmitRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RecoveryApplicationData) => {
      const response = await submitRecoveryApplicationDag(data.application.name, data)
      return createRecoveryApplication(data, { status: response.status, remotePath: response.remote_path })
    },
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
