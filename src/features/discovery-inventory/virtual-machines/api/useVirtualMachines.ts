import { useQuery } from '@tanstack/react-query'
import { fetchVirtualMachines } from './virtualMachinesApi'

export function useVirtualMachines() {
  return useQuery({
    queryKey: ['virtual-machines'],
    queryFn: fetchVirtualMachines,
  })
}