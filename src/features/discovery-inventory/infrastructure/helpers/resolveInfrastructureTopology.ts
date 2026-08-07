import type { DiscoveryInventory, PowerInventory } from '../../model/discoveryTypes'
import type { FlashSystemVolumeTree } from '../../api/discoveryInventoryApi'
import type { InfrastructureTopology, InfrastructureTopologyPlatform } from '../model/topologyTypes'
import { isPowerInventory } from '../../helpers/inventoryTypeGuards'
import { mapInventoryToTopology } from './mapInventoryToTopology'
import { mapPowerInventoryToTopology } from './mapPowerInventoryToTopology'
import { mapFlashSystemVolumeTreeToTopology } from './mapFlashSystemVolumeTreeToTopology'

export function resolveInfrastructureTopology(
  platform: InfrastructureTopologyPlatform,
  inventory: DiscoveryInventory | PowerInventory | null | undefined,
  flashSystemTree: FlashSystemVolumeTree | null | undefined,
  providerType: string | undefined,
): InfrastructureTopology | null {
  if (platform === 'flashsystem') {
    return flashSystemTree ? mapFlashSystemVolumeTreeToTopology(flashSystemTree.nodes) : null
  }

  if (!inventory) return null

  if (providerType === 'IBM_POWER') {
    return isPowerInventory(inventory) ? mapPowerInventoryToTopology(inventory) : null
  }

  return isPowerInventory(inventory) ? null : mapInventoryToTopology(inventory)
}
