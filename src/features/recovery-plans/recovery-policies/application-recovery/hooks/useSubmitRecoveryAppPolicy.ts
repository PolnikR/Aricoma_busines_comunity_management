import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitRecoveryAppPolicy } from '../api/recoveryAppPoliciesApi'
import { recoveryAppPolicyKeys } from '../api/recoveryAppPolicyQueryKeys'

export function useSubmitRecoveryAppPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitRecoveryAppPolicy,
    onSuccess: policies => queryClient.setQueryData(recoveryAppPolicyKeys.list(), policies),
  })
}
