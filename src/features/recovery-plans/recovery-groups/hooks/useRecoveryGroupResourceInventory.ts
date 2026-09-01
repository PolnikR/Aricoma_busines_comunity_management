import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFlashSystemInventory } from '@/features/discovery-inventory/resources/api/flashSystemInventoryApi'
import { fetchPowerInventory } from '@/features/discovery-inventory/resources/api/powerInventoryApi'
import { discoveryInventoryKeys } from '@/features/discovery-inventory/resources/api/resourceInventoryQueryKeys'
import { useVmwareResourceInventory } from '@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory'
import type {
  DiscoveredVirtualMachine,
  DiscoveryInventory,
  FlashSystemInventory,
  PowerInventory,
  PowerPartitionResource,
} from '@/features/discovery-inventory/resources/model/discoveryTypes'
import type { RecoveryGroupVmMetadata, RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourceInventory {
  resourceNames: string[]
  vmMetadataByName: Record<string, RecoveryGroupVmMetadata>
}

interface RecoveryGroupResourceInventoryOptions {
  vmwareNamePrefix?: string
  enabled?: boolean
}

type ResourceInventory = DiscoveryInventory | PowerInventory | FlashSystemInventory

interface InventoryQueryDefinition {
  queryKey: readonly unknown[]
  queryFn: () => Promise<ResourceInventory>
}

function getInventoryQueryDefinition(
  workloadType: Exclude<RecoveryGroupWorkloadType, 'vmware_virtual_machines'>,
  providerId: string,
): InventoryQueryDefinition {
  switch (workloadType) {
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
  { vmwareNamePrefix, enabled = true }: RecoveryGroupResourceInventoryOptions = {},
) {
  const isVmware = workloadType === 'vmware_virtual_machines'
  const vmwareQuery = useVmwareResourceInventory({
    ...(isVmware && providerId ? { providerId } : {}),
    ...(isVmware && vmwareNamePrefix !== undefined ? { namePrefix: vmwareNamePrefix } : {}),
    enabled: enabled && isVmware,
  })
  const definition = workloadType && providerId && !isVmware
    ? getInventoryQueryDefinition(workloadType, providerId)
    : null

  const selectFn = useCallback((inventory: ResourceInventory) => ({
    resourceNames: Array.from(new Set(
      getResourceNames(inventory).map(name => name.trim()).filter(Boolean),
    )),
    vmMetadataByName: workloadType ? getVmMetadataByName(workloadType, inventory) : {},
  }), [workloadType])

  const nonVmwareQuery = useQuery<ResourceInventory, Error, RecoveryGroupResourceInventory>({
    queryKey: definition?.queryKey ?? [...discoveryInventoryKeys.all, 'inactive'],
    queryFn: () => {
      if (!definition) throw new Error('A workload type and provider are required')
      return definition.queryFn()
    },
    select: selectFn,
    enabled: enabled && definition !== null,
  })
  const vmwareData = useMemo(
    () => vmwareQuery.data ? selectFn(vmwareQuery.data) : undefined,
    [selectFn, vmwareQuery.data],
  )

  if (isVmware) {
    return {
      ...vmwareQuery,
      data: vmwareData,
      isSearching: vmwareQuery.isDebouncing || vmwareQuery.isBackgroundFetching,
    }
  }

  return { ...nonVmwareQuery, isSearching: false }
}
