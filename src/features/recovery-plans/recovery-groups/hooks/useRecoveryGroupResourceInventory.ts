import { useQuery } from '@tanstack/react-query'
import {
  fetchFlashSystemInventory,
  fetchPowerInventory,
  fetchVmwareInventory,
} from '@/features/discovery-inventory/api/discoveryInventoryApi'
import {
  DISCOVERY_INVENTORY_GC_TIME_MS,
  DISCOVERY_INVENTORY_STALE_TIME_MS,
  discoveryInventoryKeys,
} from '@/features/discovery-inventory/api/discoveryInventoryQueryKeys'
import type {
  DiscoveryInventory,
  FlashSystemInventory,
  PowerInventory,
} from '@/features/discovery-inventory/model/discoveryTypes'
import type { RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourceInventory {
  resourceNames: string[]
}

type ResourceInventory = DiscoveryInventory | PowerInventory | FlashSystemInventory

interface InventoryQueryDefinition {
  queryKey: readonly unknown[]
  queryFn: () => Promise<ResourceInventory>
}

function getInventoryQueryDefinition(
  workloadType: RecoveryGroupWorkloadType,
  providerId: string,
): InventoryQueryDefinition {
  switch (workloadType) {
    case 'vmware_virtual_machines':
      return {
        queryKey: discoveryInventoryKeys.inventory(providerId),
        queryFn: () => fetchVmwareInventory(providerId),
      }
    case 'ibm_power_virtual_machines':
      return {
        queryKey: discoveryInventoryKeys.resourceInventory('IBM_POWER', providerId),
        queryFn: () => fetchPowerInventory(providerId),
      }
    case 'ibm_flashsystem':
      return {
        queryKey: discoveryInventoryKeys.resourceInventory('FLASHCOPY', providerId),
        queryFn: () => fetchFlashSystemInventory(providerId),
      }
  }
}

function getResourceNames(inventory: ResourceInventory): string[] {
  if ('resources' in inventory) {
    return inventory.resources.map(resource => resource.name)
  }
  if ('partitions' in inventory) {
    return inventory.partitions.map(resource => resource.partitionName)
  }
  return inventory.virtualMachines.map(resource => resource.name)
}

export function useRecoveryGroupResourceInventory(
  workloadType: RecoveryGroupWorkloadType | null,
  providerId: string | null,
  enabled = true,
) {
  const definition = workloadType && providerId
    ? getInventoryQueryDefinition(workloadType, providerId)
    : null

  return useQuery<ResourceInventory, Error, RecoveryGroupResourceInventory>({
    queryKey: definition?.queryKey ?? [...discoveryInventoryKeys.all, 'inactive'],
    queryFn: () => {
      if (!definition) throw new Error('A workload type and provider are required')
      return definition.queryFn()
    },
    select: inventory => ({
      resourceNames: Array.from(new Set(
        getResourceNames(inventory).map(name => name.trim()).filter(Boolean),
      )),
    }),
    enabled: enabled && definition !== null,
    staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
    gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
