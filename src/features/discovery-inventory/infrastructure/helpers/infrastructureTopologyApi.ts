import { fetchDiscoveryInventory } from '@/features/api/discoveryInventoryApi'
import { mapInventoryToTopology } from './mapInventoryToTopology'
import type { InfrastructureTopology } from '../model/topologyTypes'

export async function fetchInfrastructureTopology(): Promise<InfrastructureTopology> {
  const inventory = await fetchDiscoveryInventory()
  return mapInventoryToTopology(inventory)
}
