import { useAllVirtualMachines } from '../virtual-machines/api/useAllVirtualMachines'
import { useInfrastructureTopology } from '../infrastructure/api/useInfrastructureTopology'
import type { AllVirtualMachinesData } from '../virtual-machines/helpers/virtualMachinesApi'
import type { InfrastructureTopology } from '../infrastructure/model/topologyTypes'

export const virtualMachinesUnifiedQueryKey = ['virtual-machines-unified'] as const

interface UseVirtualMachinesUnifiedResult {
  vmList: AllVirtualMachinesData | undefined
  topology: InfrastructureTopology | undefined
  isLoading: boolean
  error: Error | null
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
  const error = vmQuery.error || topologyQuery.error

  return {
    vmList: vmQuery.data,
    topology: topologyQuery.data,
    isLoading,
    error: error as Error | null,
  }
}
