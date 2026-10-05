import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PowerVmsResponse, VolumesResponse } from '@/generated/query/zod'
import {
  createFlashSystemInventorySelect,
  createPowerInventorySelect,
  flashSystemInventoryQuery,
  powerInventoryQuery,
} from '@/features/discovery-inventory/resources/model/inventoryQueries'
import { useVmwareResourceInventory } from '@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory'
import type {
  DiscoveredVirtualMachine,
  DiscoveryInventory,
  FlashSystemInventory,
  PowerInventory,
  PowerPartitionResource,
} from '@/features/discovery-inventory/resources/model/discoveryTypes'
import { resolveVmwareProviderFilter } from '@/features/discovery-inventory/resources/helpers/vmwareProviderFilter'
import { getRecoveryGroupSearchMode } from '../helpers/recoveryGroupSearchMode'
import type {
  RecoveryGroupProviderScope,
  RecoveryGroupVmMetadata,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

interface RecoveryGroupResourceInventory {
  resourceNames: string[]
  vmMetadataByName: Record<string, RecoveryGroupVmMetadata>
}

interface RecoveryGroupResourceInventoryOptions {
  /**
   * Fixed scope of the selected provider. `undefined` means the provider record is
   * not known yet, so VM inventory is not requested; `null` means no scope.
   */
  providerScope?: RecoveryGroupProviderScope | null
  /** User VMware name search; sent to the server only when the provider has no fixed scope. */
  vmwareNamePrefix?: string
  enabled?: boolean
}

type ResourceInventory = DiscoveryInventory | PowerInventory | FlashSystemInventory

interface InventoryQueryDefinition {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>
  toInventory: (response: unknown) => ResourceInventory
}

function getInventoryQueryDefinition(
  workloadType: Exclude<RecoveryGroupWorkloadType, 'vmware_virtual_machines'>,
  providerId: string,
): InventoryQueryDefinition {
  switch (workloadType) {
    case 'ibm_power_virtual_machines': {
      const select = createPowerInventorySelect(providerId)
      return { ...powerInventoryQuery(providerId), toInventory: response => select(response as PowerVmsResponse) }
    }
    case 'ibm_flashsystem': {
      const select = createFlashSystemInventorySelect(providerId)
      return { ...flashSystemInventoryQuery(providerId), toInventory: response => select(response as VolumesResponse) }
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
  { providerScope, vmwareNamePrefix, enabled = true }: RecoveryGroupResourceInventoryOptions = {},
) {
  const isVmware = workloadType === 'vmware_virtual_machines'
  const isPower = workloadType === 'ibm_power_virtual_machines'
  const isScopeKnown = (!isVmware && !isPower) || providerScope !== undefined
  // Same normalization as the Resources page: trimmed prefix, first non-empty tag.
  const vmwareFilter = resolveVmwareProviderFilter(isVmware ? providerScope : null)
  // The Power inventory has no tags, so only the name prefix is enforced there.
  const powerPrefix = isPower ? providerScope?.vmPrefix?.trim() ?? '' : ''
  // The provider scope wins: a user search can never replace or widen it.
  const usesServerSearch = getRecoveryGroupSearchMode(workloadType, providerScope) === 'server'
  const vmwareQuery = useVmwareResourceInventory({
    ...(isVmware && providerId ? { providerId } : {}),
    ...(vmwareFilter.prefix ? { namePrefix: vmwareFilter.prefix } : {}),
    ...(usesServerSearch && vmwareNamePrefix !== undefined ? { namePrefix: vmwareNamePrefix } : {}),
    ...(vmwareFilter.tag ? { tag: vmwareFilter.tag } : {}),
    enabled: enabled && isVmware && isScopeKnown,
  })
  const definition = useMemo(
    () => workloadType && providerId && workloadType !== 'vmware_virtual_machines'
      ? getInventoryQueryDefinition(workloadType, providerId)
      : null,
    [providerId, workloadType],
  )

  const selectFn = useCallback((inventory: ResourceInventory) => {
    const scopedInventory = powerPrefix && 'partitions' in inventory
      ? { ...inventory, partitions: inventory.partitions.filter(partition => partition.partitionName.startsWith(powerPrefix)) }
      : inventory
    return {
      resourceNames: Array.from(new Set(
        getResourceNames(scopedInventory).map(name => name.trim()).filter(Boolean),
      )),
      vmMetadataByName: workloadType ? getVmMetadataByName(workloadType, scopedInventory) : {},
    }
  }, [powerPrefix, workloadType])

  const selectResponse = useCallback(
    (response: unknown) => {
      if (!definition) throw new Error('A workload type and provider are required')
      return selectFn(definition.toInventory(response))
    },
    [definition, selectFn],
  )
  const nonVmwareQuery = useQuery<unknown, Error, RecoveryGroupResourceInventory>({
    queryKey: definition?.queryKey ?? ['recovery-group-resource-inventory', 'inactive'],
    queryFn: definition?.queryFn ?? (() => Promise.reject(new Error('A workload type and provider are required'))),
    select: selectResponse,
    enabled: enabled && definition !== null && isScopeKnown,
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
