import { useQuery } from '@tanstack/react-query'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { discoveryInventoryKeys } from '../../resources/api/resourceInventoryQueryKeys'
import { fetchPowerInventory } from '../../resources/api/powerInventoryApi'
import { fetchVmwareInventory } from '../../resources/api/vmwareInventoryApi'
import type { DiscoveryInventory, PowerInventory } from '../../resources/model/discoveryTypes'

export type InfrastructureInventory = DiscoveryInventory | PowerInventory

export function useInfrastructureInventory(provider: ProviderRecord | null) {
  const isSupported = provider?.type === 'VMWARE' || provider?.type === 'IBM_POWER'
  const queryKey = provider?.type === 'IBM_POWER'
    ? discoveryInventoryKeys.resourceInventory('IBM_POWER', provider.id)
    : provider?.type === 'VMWARE'
      ? discoveryInventoryKeys.vmwareSearch({ providerId: provider.id })
      : ['infrastructure-topology', 'inactive'] as const

  return useQuery<InfrastructureInventory>({
    queryKey,
    queryFn: () => {
      if (provider?.type === 'IBM_POWER') return fetchPowerInventory(provider.id)
      if (provider?.type === 'VMWARE') return fetchVmwareInventory({ providerId: provider.id })
      throw new Error('A supported infrastructure provider is required.')
    },
    enabled: isSupported,
  })
}
