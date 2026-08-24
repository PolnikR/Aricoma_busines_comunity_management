import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitSnapshotPolicy } from '../api/snapshotPoliciesApi'
import { snapshotPolicyKeys } from '../api/snapshotPolicyQueryKeys'

export function useSubmitSnapshotPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitSnapshotPolicy,
    onSuccess: policies => queryClient.setQueryData(snapshotPolicyKeys.list(), policies),
  })
}
