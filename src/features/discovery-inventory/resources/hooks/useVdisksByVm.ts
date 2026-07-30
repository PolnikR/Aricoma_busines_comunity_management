import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../../api/discoveryInventoryQueryKeys'
import { fetchVdisksByVm } from '../api/vdisksApi'

export function useVdisksByVm(vmName: string, providerId?: string) {
  return useQuery({
    queryKey: discoveryInventoryKeys.vdisksByVm(vmName, providerId),
    queryFn: () => fetchVdisksByVm(vmName, providerId),
    enabled: !!vmName,
    refetchOnWindowFocus: false,
  })
}
