import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/discoveryInventoryQueryKeys'
import { fetchTags } from '../api/tagsApi'

export function useTags() {
  return useQuery({
    queryKey: discoveryInventoryKeys.tags(),
    queryFn: fetchTags,
  })
}
