import { useQuery } from '@tanstack/react-query'
import { fetchAllVirtualMachines } from './virtualMachinesApi'

export function useAllVirtualMachines() {
  return useQuery({
    queryKey: ['virtual-machines-all'],
    queryFn: fetchAllVirtualMachines,
  })
}
