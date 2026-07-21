import { useQuery } from '@tanstack/react-query'
import { fetchAllVirtualMachines } from '../helpers/virtualMachinesApi'

export function useAllVirtualMachines() {
  return useQuery({
    queryKey: ['virtual-machines-all'],
    queryFn: fetchAllVirtualMachines,
    staleTime: 5 * 60 * 1000,
  })
}
