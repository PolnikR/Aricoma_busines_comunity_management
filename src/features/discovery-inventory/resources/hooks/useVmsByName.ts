import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { fetchVmsByName } from '../api/vmsByNameApi'

export function useVmsByName(prefix?: string, providerId?: string, enabled = true) {
  return useQuery({
    queryKey: discoveryInventoryKeys.rawVmsByName(prefix, providerId),
    queryFn: () => fetchVmsByName({
      ...(prefix !== undefined ? { prefix } : {}),
      ...(providerId !== undefined ? { providerId } : {}),
    }),
    enabled,
  })
}
