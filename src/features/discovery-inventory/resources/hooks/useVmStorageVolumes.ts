import { useQuery } from '@tanstack/react-query'
import { selectVdisks, vdisksByVmQuery } from '../model/inventoryQueries'

export function useVdisksByVm(
  vmName: string,
  providerId?: string,
) {
  return useQuery({
    ...vdisksByVmQuery(vmName, providerId),
    select: selectVdisks,
    enabled: !!vmName && !!providerId,
  })
}
