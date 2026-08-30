import { useQuery } from '@tanstack/react-query'
import { fetchDiscoveryCacheHistory } from '../api/discoveryCacheApi'
import { discoveryCacheKeys } from '../api/discoveryCacheQueryKeys'
import type { DiscoveryCacheHistoryFilters } from '../model/discoveryCacheTypes'

export function useDiscoveryCacheHistory(filters: DiscoveryCacheHistoryFilters = {}) {
  return useQuery({ queryKey: discoveryCacheKeys.history(filters), queryFn: () => fetchDiscoveryCacheHistory(filters) })
}
