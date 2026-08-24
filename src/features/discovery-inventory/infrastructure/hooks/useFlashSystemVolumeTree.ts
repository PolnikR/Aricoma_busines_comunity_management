import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../../resources/api/resourceInventoryQueryKeys'
import { fetchFlashSystemVolumeTree } from '../api/flashSystemVolumeTreeApi'
import type { FlashSystemVolumeTreeView } from '../model/flashSystemVolumeTreeTypes'

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
  })
}
