import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCleanRoomPolicy } from '../api/cleanRoomPoliciesApi'
import { cleanRoomPolicyKeys } from '../api/cleanRoomPolicyQueryKeys'

export function useDeleteCleanRoomPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCleanRoomPolicy,
    onSuccess: policies => queryClient.setQueryData(cleanRoomPolicyKeys.list(), policies),
  })
}
