import { useQuery } from '@tanstack/react-query'
import {
  fetchFlashSystemInventory,
  fetchPowerInventory,
  fetchVmwareInventory,
} from '@/features/discovery-inventory/api/discoveryInventoryApi'
import { recoveryGroupKeys } from '../api/recoveryGroupQueryKeys'
import type { RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourceInventory {
  resourceNames: string[]
}

async function fetchResourceNames(
  workloadType: RecoveryGroupWorkloadType,
  providerId: string,
): Promise<string[]> {
  switch (workloadType) {
    case 'vmware_virtual_machines': {
      const inventory = await fetchVmwareInventory(providerId)
      return inventory.virtualMachines.map(resource => resource.name)
    }
    case 'ibm_power_virtual_machines': {
      const inventory = await fetchPowerInventory(providerId)
      return inventory.partitions.map(resource => resource.partitionName)
    }
    case 'ibm_flashsystem': {
      const inventory = await fetchFlashSystemInventory(providerId)
      return inventory.resources.map(resource => resource.name)
    }
  }
}

export function useRecoveryGroupResourceInventory(
  workloadType: RecoveryGroupWorkloadType | null,
  providerId: string | null,
  enabled = true,
) {
  return useQuery<RecoveryGroupResourceInventory>({
    queryKey: recoveryGroupKeys.resourceOptions(workloadType, providerId),
    queryFn: async () => {
      if (!workloadType || !providerId) return { resourceNames: [] }
      const names = await fetchResourceNames(workloadType, providerId)
      return {
        resourceNames: Array.from(new Set(names.map(name => name.trim()).filter(Boolean))),
      }
    },
    enabled: enabled && Boolean(workloadType && providerId),
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
