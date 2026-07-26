import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from './discoveryInventoryQueryKeys'
import { fetchTags } from './tagsApi'

export function useTags() {
  return useQuery({
    queryKey: discoveryInventoryKeys.tags(),
    queryFn: fetchTags,
  })
}
