import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/discoveryInventoryQueryKeys'
import { fetchDiscoveryInventory } from '../api/discoveryInventoryApi'

export function useDiscoveryInventory(providerId?: string, tag?: string) {
  return useQuery({
    queryKey: discoveryInventoryKeys.inventory(providerId, tag),
    queryFn: () => fetchDiscoveryInventory(providerId, tag),
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
