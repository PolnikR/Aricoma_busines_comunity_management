import { useQuery } from '@tanstack/react-query'
import { fetchRecoveryAppPolicies } from '../api/recoveryAppPoliciesApi'
import { recoveryAppPolicyKeys } from '../api/recoveryAppPolicyQueryKeys'

export function useRecoveryAppPolicies() {
  return useQuery({
    queryKey: recoveryAppPolicyKeys.list(),
    queryFn: fetchRecoveryAppPolicies,
  })
}
