import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { DiscoveryInventory, FlashSystemInventory, PowerInventory } from '../model/discoveryTypes'
import { fetchVmwareInventory } from './vmwareInventoryApi'
import { fetchPowerInventory } from './powerInventoryApi'
import { fetchFlashSystemInventory } from './flashSystemInventoryApi'

export type ProviderInventory =
  | { source: 'vmware'; provider: ProviderRecord; inventory: DiscoveryInventory }
  | { source: 'power'; provider: ProviderRecord; inventory: PowerInventory }
  | { source: 'flashsystem'; provider: ProviderRecord; inventory: FlashSystemInventory }

export async function fetchInventory(provider: ProviderRecord, tag?: string): Promise<ProviderInventory> {
  switch (provider.type) {
    case 'VMWARE':
      return { source: 'vmware', provider, inventory: await fetchVmwareInventory(provider.id, tag) }
    case 'IBM_POWER':
      return { source: 'power', provider, inventory: await fetchPowerInventory(provider.id) }
    case 'FLASHCOPY':
      return { source: 'flashsystem', provider, inventory: await fetchFlashSystemInventory(provider.id) }
  }
}
