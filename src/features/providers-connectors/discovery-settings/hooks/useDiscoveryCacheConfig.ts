import { useQuery } from '@tanstack/react-query'
import { fetchDiscoveryCacheConfig } from '../api/discoveryCacheApi'
import { discoveryCacheKeys } from '../api/discoveryCacheQueryKeys'

export function useDiscoveryCacheConfig(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: discoveryCacheKeys.config(),
    queryFn: fetchDiscoveryCacheConfig,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  })
}
