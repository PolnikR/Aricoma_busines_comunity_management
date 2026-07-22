import { useAllVirtualMachines } from '@/features/discovery-inventory/virtual-machines/api/useAllVirtualMachines'
import { useInfrastructureTopology } from '@/features/discovery-inventory/infrastructure/api/useInfrastructureTopology'
import type { AllVirtualMachinesData } from '@/features/discovery-inventory/virtual-machines/helpers/virtualMachinesApi'
import type { InfrastructureTopology } from '@/features/discovery-inventory/infrastructure/model/topologyTypes'

export const virtualMachinesUnifiedQueryKey = ['virtual-machines-unified'] as const

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
export function useVirtualMachinesUnified(): UseVirtualMachinesUnifiedResult {
  const vmQuery = useAllVirtualMachines()
  const topologyQuery = useInfrastructureTopology()

  const isLoading = vmQuery.isLoading || topologyQuery.isLoading
  const isFetching = vmQuery.isFetching || topologyQuery.isFetching
  const error = vmQuery.error || topologyQuery.error

  const refetch = () => {
    void vmQuery.refetch()
    void topologyQuery.refetch()
  }

  return {
    vmList: vmQuery.data,
    topology: topologyQuery.data,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  }
}
