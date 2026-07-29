import { useQuery } from '@tanstack/react-query'
import { fetchProviders } from '../api/providersApi'
import { providerKeys } from '../api/providerQueryKeys'

export function useProviders() {
  return useQuery({
    queryKey: providerKeys.list(),
    queryFn: fetchProviders,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
