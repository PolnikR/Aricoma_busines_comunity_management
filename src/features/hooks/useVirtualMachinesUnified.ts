import { useMemo } from 'react'
import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { mapInventoryToTopology } from '@/features/discovery-inventory/infrastructure/helpers/mapInventoryToTopology'
import { mapInventoryToVirtualMachines } from '@/features/discovery-inventory/virtual-machines/helpers/mapInventoryToVirtualMachines'
import type { AllVirtualMachinesData } from '@/features/discovery-inventory/virtual-machines/helpers/mapInventoryToVirtualMachines'
import type { InfrastructureTopology } from '@/features/discovery-inventory/infrastructure/model/topologyTypes'

interface UseVirtualMachinesUnifiedResult {
  vmList: AllVirtualMachinesData | undefined
  topology: InfrastructureTopology | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Unified hook for VM data across the application.
 * Combines VM list and infrastructure topology data.
 * Stale time: 15 minutes (inherited from underlying hooks)
 * Used by: Virtual Machines page, Infrastructure page, Recovery Applications
 *
 * @returns {UseVirtualMachinesUnifiedResult} Combined VM data with list and topology
 */
export function useVirtualMachinesUnified(providerId?: string, tag?: string): UseVirtualMachinesUnifiedResult {
  const inventoryQuery = useDiscoveryInventory(providerId, tag)
  const vmList = useMemo(
    () => inventoryQuery.data ? mapInventoryToVirtualMachines(inventoryQuery.data) : undefined,
    [inventoryQuery.data],
  )
  const topology = useMemo(
    () => inventoryQuery.data ? mapInventoryToTopology(inventoryQuery.data) : undefined,
    [inventoryQuery.data],
  )

  return {
    vmList,
    topology,
    isLoading: inventoryQuery.isLoading,
    isFetching: inventoryQuery.isFetching,
    error: inventoryQuery.error,
    refetch: () => { void inventoryQuery.refetch() },
  }
}
