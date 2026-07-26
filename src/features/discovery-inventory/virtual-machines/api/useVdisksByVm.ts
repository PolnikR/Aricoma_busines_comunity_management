import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../../api/discoveryInventoryQueryKeys'
import { fetchVdisksByVm } from './vdisksApi'

export function useVdisksByVm(vmName: string, providerId?: string) {
  return useQuery({
    queryKey: discoveryInventoryKeys.vdisksByVm(vmName, providerId),
    queryFn: () => fetchVdisksByVm(vmName, providerId),
    enabled: !!vmName,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
