import { useQuery } from '@tanstack/react-query'
import { fetchSnapshotPolicies } from '../api/snapshotPoliciesApi'
import { snapshotPolicyKeys } from '../api/snapshotPolicyQueryKeys'

export function useSnapshotPolicies() {
  return useQuery({
    queryKey: snapshotPolicyKeys.list(),
    queryFn: fetchSnapshotPolicies,
  })
}
