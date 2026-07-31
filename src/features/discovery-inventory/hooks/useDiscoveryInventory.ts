import { useQuery } from '@tanstack/react-query'
import {
  DISCOVERY_INVENTORY_GC_TIME_MS,
  DISCOVERY_INVENTORY_STALE_TIME_MS,
  discoveryInventoryKeys,
} from '../api/discoveryInventoryQueryKeys'
import { fetchVmwareInventory } from '../api/discoveryInventoryApi'

export function useDiscoveryInventory(providerId?: string, tag?: string, enabled = true) {
  return useQuery({
    queryKey: discoveryInventoryKeys.inventory(providerId, tag),
    queryFn: () => fetchVmwareInventory(providerId, tag),
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
    staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
    gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
  })
}
