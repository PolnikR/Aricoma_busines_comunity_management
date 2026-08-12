import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSnapshotPolicy } from '../api/snapshotPoliciesApi'
import { snapshotPolicyKeys } from '../api/snapshotPolicyQueryKeys'

export function useDeleteSnapshotPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSnapshotPolicy,
    onSuccess: policies => queryClient.setQueryData(snapshotPolicyKeys.list(), policies),
  })
}
