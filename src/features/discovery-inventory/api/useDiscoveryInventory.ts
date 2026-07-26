import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from './discoveryInventoryQueryKeys'
import { fetchDiscoveryInventory } from './discoveryInventoryApi'

export function useDiscoveryInventory(providerId?: string, tag?: string) {
  return useQuery({
    queryKey: discoveryInventoryKeys.inventory(providerId, tag),
    queryFn: () => fetchDiscoveryInventory(providerId, tag),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
