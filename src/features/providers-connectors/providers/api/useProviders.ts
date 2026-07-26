import { useQuery } from '@tanstack/react-query'
import { fetchProviders } from './providersApi'
import { providerKeys } from './providerQueryKeys'

export function useProviders() {
  return useQuery({
    queryKey: providerKeys.list(),
    queryFn: fetchProviders,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
