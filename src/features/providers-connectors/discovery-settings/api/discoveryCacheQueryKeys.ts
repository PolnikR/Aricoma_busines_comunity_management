import type { DiscoveryCacheHistoryFilters } from '../model/discoveryCacheTypes'

export const discoveryCacheKeys = {
  all: ['discovery-cache'] as const,
  config: () => [...discoveryCacheKeys.all, 'config'] as const,
  history: (filters: DiscoveryCacheHistoryFilters = {}) => [
    ...discoveryCacheKeys.all,
    'history',
    filters.providerId ?? null,
    filters.limit ?? null,
  ] as const,
}
