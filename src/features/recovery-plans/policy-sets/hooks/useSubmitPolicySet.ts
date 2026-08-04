import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitPolicySet } from '../api/policySetsApi'
import { policySetKeys } from '../api/policySetQueryKeys'

export function useSubmitPolicySet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitPolicySet,
    onSuccess: policySets => queryClient.setQueryData(policySetKeys.list(), policySets),
  })
}
