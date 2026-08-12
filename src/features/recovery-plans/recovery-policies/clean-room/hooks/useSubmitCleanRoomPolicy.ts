import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitCleanRoomPolicy } from '../api/cleanRoomPoliciesApi'
import { cleanRoomPolicyKeys } from '../api/cleanRoomPolicyQueryKeys'

export function useSubmitCleanRoomPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitCleanRoomPolicy,
    onSuccess: policies => queryClient.setQueryData(cleanRoomPolicyKeys.list(), policies),
  })
}
