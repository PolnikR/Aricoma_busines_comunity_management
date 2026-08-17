import { useQuery } from '@tanstack/react-query'
import { fetchPolicySets } from '../api/policySetsApi'
import { policySetKeys } from '../api/policySetQueryKeys'

export function usePolicySets() {
  return useQuery({
    queryKey: policySetKeys.list(),
    queryFn: fetchPolicySets,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
