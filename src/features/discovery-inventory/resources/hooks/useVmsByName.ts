import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { fetchVmsByName } from '../api/vmsByNameApi'

export function useVmsByName(prefix?: string, providerId?: string, enabled = true) {
  return useQuery({
    queryKey: discoveryInventoryKeys.vmsByName(prefix, providerId),
    queryFn: () => fetchVmsByName({ prefix, providerId }),
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
  })
}
