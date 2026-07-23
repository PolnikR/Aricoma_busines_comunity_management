import { useQuery } from '@tanstack/react-query'
import { fetchAllVirtualMachines } from '../helpers/virtualMachinesApi'

export function useAllVirtualMachines(providerId?: string) {
  return useQuery({
    queryKey: ['virtual-machines-all', providerId ?? null],
    queryFn: () => fetchAllVirtualMachines(providerId),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
