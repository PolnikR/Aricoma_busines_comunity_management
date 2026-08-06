import { useQuery } from '@tanstack/react-query'
import {
  DISCOVERY_INVENTORY_GC_TIME_MS,
  DISCOVERY_INVENTORY_STALE_TIME_MS,
  discoveryInventoryKeys,
} from '../../api/discoveryInventoryQueryKeys'
import { fetchFlashSystemVolumeTree } from '../../api/discoveryInventoryApi'
import type { FlashSystemVolumeTreeView } from '../../model/discoveryTypes'

export function useFlashSystemVolumeTree(providerId: string | undefined, view: FlashSystemVolumeTreeView | undefined) {
  return useQuery({
    queryKey: discoveryInventoryKeys.volumeTree(providerId, view),
    queryFn: () => {
      if (!providerId || !view) {
        throw new Error('A provider and view are required to fetch the FlashSystem volume tree.')
      }
      return fetchFlashSystemVolumeTree(providerId, view)
    },
    enabled: Boolean(providerId) && Boolean(view),
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
    gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
  })
}
