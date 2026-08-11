import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { fetchTags } from '../api/vmwareTagsApi'

export function useTags(enabled = true) {
  return useQuery({
    queryKey: discoveryInventoryKeys.tags(),
    queryFn: fetchTags,
    enabled,
  })
}
