import { useQuery } from '@tanstack/react-query'
import { fetchPlatformProviders } from '../api/platformProvidersApi'
import { platformProviderKeys } from '../api/platformProviderQueryKeys'

export function usePlatformProviders() {
  return useQuery({
    queryKey: platformProviderKeys.list(),
    queryFn: fetchPlatformProviders,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
