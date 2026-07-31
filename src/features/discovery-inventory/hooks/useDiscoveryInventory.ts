import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/discoveryInventoryQueryKeys'
import { fetchVmwareInventory } from '../api/discoveryInventoryApi'

export function useDiscoveryInventory(providerId?: string, tag?: string, enabled = true) {
  return useQuery({
    queryKey: discoveryInventoryKeys.inventory(providerId, tag),
    queryFn: () => fetchVmwareInventory(providerId, tag),
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
  })
}
