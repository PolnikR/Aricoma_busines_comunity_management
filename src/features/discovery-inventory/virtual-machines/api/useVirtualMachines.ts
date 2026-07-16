import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { VirtualMachinesQuery } from '../types'
import { fetchVirtualMachines } from './virtualMachinesApi'

export function useVirtualMachines(query: VirtualMachinesQuery) {
  return useQuery({
    queryKey: ['virtual-machines', query],
    queryFn: async () => fetchVirtualMachines(query),
    placeholderData: keepPreviousData,
  })
}
