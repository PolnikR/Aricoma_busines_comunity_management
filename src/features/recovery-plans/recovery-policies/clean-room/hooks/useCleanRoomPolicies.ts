import { useQuery } from '@tanstack/react-query'
import { fetchCleanRoomPolicies } from '../api/cleanRoomPoliciesApi'
import { cleanRoomPolicyKeys } from '../api/cleanRoomPolicyQueryKeys'

export function useCleanRoomPolicies() {
  return useQuery({
    queryKey: cleanRoomPolicyKeys.list(),
    queryFn: fetchCleanRoomPolicies,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
