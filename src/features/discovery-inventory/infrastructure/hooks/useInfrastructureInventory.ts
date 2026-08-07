import { useQuery } from '@tanstack/react-query'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  DISCOVERY_INVENTORY_GC_TIME_MS,
  DISCOVERY_INVENTORY_STALE_TIME_MS,
  discoveryInventoryKeys,
} from '../../api/discoveryInventoryQueryKeys'
import { fetchPowerInventory, fetchVmwareInventory } from '../../api/discoveryInventoryApi'
import type { DiscoveryInventory, PowerInventory } from '../../model/discoveryTypes'

export type InfrastructureInventory = DiscoveryInventory | PowerInventory

export function useInfrastructureInventory(provider: ProviderRecord | null) {
  const isSupported = provider?.type === 'VMWARE' || provider?.type === 'IBM_POWER'
  const queryKey = provider?.type === 'IBM_POWER'
    ? discoveryInventoryKeys.resourceInventory('IBM_POWER', provider.id)
    : provider?.type === 'VMWARE'
      ? discoveryInventoryKeys.resourceInventory('VMWARE', provider.id)
      : ['infrastructure-topology', 'inactive'] as const

  return useQuery<InfrastructureInventory>({
    queryKey,
    queryFn: () => {
      if (provider?.type === 'IBM_POWER') return fetchPowerInventory(provider.id)
      if (provider?.type === 'VMWARE') return fetchVmwareInventory(provider.id)
      throw new Error('A supported infrastructure provider is required.')
    },
    enabled: isSupported,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
    gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
  })
}
