import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { fetchTags } from '../api/vmwareTagsApi'

export function useTags(providerId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: discoveryInventoryKeys.tags(providerId),
    queryFn: () => providerId ? fetchTags(providerId) : Promise.resolve([]),
    enabled: enabled && Boolean(providerId),
  })
}
