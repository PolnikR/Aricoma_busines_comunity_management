import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { fetchVdisksByVm } from '../api/vmStorageVolumesApi'

export function useVdisksByVm(
  vmName: string,
  providerId?: string,
  ibmProviderId?: string,
) {
  return useQuery({
    queryKey: discoveryInventoryKeys.vdisksByVm(vmName, providerId, ibmProviderId),
    queryFn: () => fetchVdisksByVm(vmName, providerId, ibmProviderId),
    enabled: !!vmName && !!providerId && !!ibmProviderId,
    refetchOnWindowFocus: false,
  })
}
