import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGetRecoveryAppsQueryKey,
  submitRecoveryDag,
  useGetRecoveryApps,
} from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryAppSubmission, RecoveryAppSubmitResponseOutput } from '@/generated/query/zod'
import type { SubmitRecoveryApplicationInput } from '../model/recoveryApplicationTypes'
import { selectRecoveryApplications } from '../model/selectRecoveryApplications'
import { toSubmitDagResponse } from '../model/submitDagResponse'

export function useRecoveryApplications() {
  return useGetRecoveryApps({ query: { select: selectRecoveryApplications } })
}

// Facade over the generated submit: it validates the orchestration provider and
// requires the DAG details of an orchestrator push before the page shows them.
export function useSubmitRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ providerId, data, pushToOrchestrator }: SubmitRecoveryApplicationInput) => {
      const normalizedProviderId = providerId.trim()
      if (pushToOrchestrator && !normalizedProviderId) {
        throw new Error('Platform provider ID is required')
      }
      const params = normalizedProviderId
        ? { provider_id: normalizedProviderId, push_to_orchestrator: pushToOrchestrator }
        : { push_to_orchestrator: pushToOrchestrator }
      const response = await submitRecoveryDag(data as RecoveryAppSubmission, params)
      return toSubmitDagResponse(response as RecoveryAppSubmitResponseOutput, pushToOrchestrator)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getGetRecoveryAppsQueryKey() })
    },
  })
}
