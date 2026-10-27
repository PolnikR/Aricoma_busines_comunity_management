import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGetRecoveryAppsQueryKey,
  submitRecoveryDag,
  useGetRecoveryApps,
} from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryAppSubmission, RecoveryAppSubmitResponseOutput, RecoveryAppsResponseOutput } from '@/generated/query/zod'
import type { SubmitRecoveryApplicationInput } from '../model/recoveryApplicationTypes'
import { selectRecoveryApplications } from '../model/selectRecoveryApplications'
import { toSubmitDagResponse } from '../model/submitDagResponse'
import { reconcileRecoveryApplications } from './recoveryApplicationCache'

export function useRecoveryApplications(options?: { refetchOnMount?: 'always' | boolean; enabled?: boolean }) {
  return useGetRecoveryApps({ query: { select: selectRecoveryApplications, ...options } })
}

// Facade over the generated submit: it validates the orchestration provider and
// preserves the optional push details for the result dialog after saving.
export function useSubmitRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,
    mutationFn: async ({ providerId, data, pushToOrchestrator }: SubmitRecoveryApplicationInput) => {
      const normalizedProviderId = providerId.trim()
      if (pushToOrchestrator && !normalizedProviderId) {
        throw new Error('Platform provider ID is required')
      }
      const params = normalizedProviderId
        ? { provider_id: normalizedProviderId, push_to_orchestrator: pushToOrchestrator }
        : { push_to_orchestrator: pushToOrchestrator }
      const response = await submitRecoveryDag(data as RecoveryAppSubmission, params)
      const previous = queryClient.getQueryData<RecoveryAppsResponseOutput>(getGetRecoveryAppsQueryKey())
      const applications = [previous, response as RecoveryAppSubmitResponseOutput]
        .flatMap(value => value ? selectRecoveryApplications(value) : [])
        .filter(application => application.id === data.id)
      await reconcileRecoveryApplications(queryClient, response as RecoveryAppSubmitResponseOutput, applications)
      return toSubmitDagResponse(response as RecoveryAppSubmitResponseOutput, pushToOrchestrator)
    },
    onError: async (_error, input) => {
      const previous = queryClient.getQueryData<RecoveryAppsResponseOutput>(getGetRecoveryAppsQueryKey())
      const applications = previous ? selectRecoveryApplications(previous).filter(application => application.id === input.data.id) : []
      await reconcileRecoveryApplications(queryClient, undefined, applications)
    },
  })
}
