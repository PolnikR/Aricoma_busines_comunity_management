import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteRecoveryAppPolicy } from '../api/recoveryAppPoliciesApi'
import { recoveryAppPolicyKeys } from '../api/recoveryAppPolicyQueryKeys'

export function useDeleteRecoveryAppPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRecoveryAppPolicy,
    onSuccess: policies => queryClient.setQueryData(recoveryAppPolicyKeys.list(), policies),
  })
}
