import { useQuery } from '@tanstack/react-query'
import { fetchTags } from '../../api/tagsApi'

export function useTags() {
  return useQuery({
    queryKey: ['virtual-machines-tags'],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000,
  })
}
