import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePolicySet } from '../api/policySetsApi'
import { policySetKeys } from '../api/policySetQueryKeys'

export function useDeletePolicySet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePolicySet,
    onSuccess: policySets => queryClient.setQueryData(policySetKeys.list(), policySets),
  })
}
