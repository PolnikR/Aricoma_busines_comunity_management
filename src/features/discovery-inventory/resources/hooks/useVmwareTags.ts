import { useQuery } from '@tanstack/react-query'
import { selectTags, tagsQuery } from '../model/inventoryQueries'

export function useTags(providerId: string | null | undefined, enabled = true) {
  return useQuery({
    ...tagsQuery(providerId ?? ''),
    select: selectTags,
    enabled: enabled && Boolean(providerId),
  })
}
