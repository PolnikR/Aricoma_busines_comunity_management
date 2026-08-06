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
  DiscoveredVirtualMachine,
  DiscoveryInventory,
  FlashSystemInventory,
  PowerInventory,
  PowerPartitionResource,
} from '@/features/discovery-inventory/model/discoveryTypes'
import type { RecoveryGroupVmMetadata, RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourceInventory {
  resourceNames: string[]
  vmMetadataByName: Record<string, RecoveryGroupVmMetadata>
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

function toVmMetadata(vm: DiscoveredVirtualMachine): RecoveryGroupVmMetadata {
  const storageGb = (Array.isArray(vm.disks) ? vm.disks : []).reduce((total, disk) => total + disk.capacityGb, 0)
  return {
    ...(vm.hostname ? { hostname: vm.hostname } : {}),
    ...(vm.ipAddress ? { ip_address: vm.ipAddress } : {}),
    ...(vm.guestOs ? { os: vm.guestOs } : {}),
    ...(vm.vcpu ? { cpu: vm.vcpu } : {}),
    ...(vm.memoryGb ? { memory_gb: vm.memoryGb } : {}),
    ...(storageGb ? { storage_gb: Math.round(storageGb) } : {}),
  }
}

function toPowerPartitionMetadata(partition: PowerPartitionResource): RecoveryGroupVmMetadata {
  return {
    ...(partition.operatingSystemType ? { os: partition.operatingSystemType } : {}),
  }
}

function getVmMetadataByName(
  workloadType: RecoveryGroupWorkloadType,
  inventory: ResourceInventory,
): Record<string, RecoveryGroupVmMetadata> {
  if (workloadType === 'vmware_virtual_machines' && 'virtualMachines' in inventory && !('partitions' in inventory)) {
    return Object.fromEntries(
      inventory.virtualMachines
        .map(vm => [vm.name.trim(), toVmMetadata(vm)] as const)
        .filter(([name]) => Boolean(name)),
    )
  }
  if (workloadType === 'ibm_power_virtual_machines' && 'partitions' in inventory) {
    return Object.fromEntries(
      inventory.partitions
        .map(partition => [partition.partitionName.trim(), toPowerPartitionMetadata(partition)] as const)
        .filter(([name]) => Boolean(name)),
    )
  }
  return {}
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
      vmMetadataByName: workloadType ? getVmMetadataByName(workloadType, inventory) : {},
    }),
    enabled: enabled && definition !== null,
    staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
    gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
