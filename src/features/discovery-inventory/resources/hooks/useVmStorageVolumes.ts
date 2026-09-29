import { useQuery } from '@tanstack/react-query'
import { selectVdisks, vdisksByVmQuery } from '../model/inventoryQueries'

export function useVdisksByVm(
  vmName: string,
  providerId?: string,
  ibmProviderId?: string,
) {
  return useQuery({
    ...vdisksByVmQuery(vmName, providerId, ibmProviderId),
    select: selectVdisks,
    enabled: !!vmName && !!providerId,
  })
}
