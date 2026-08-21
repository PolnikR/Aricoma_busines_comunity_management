import { useQuery } from '@tanstack/react-query'
import { fetchProviders } from '../api/providersApi'
import { providerKeys } from '../api/providerQueryKeys'
import type { ProviderRoleFilter } from '../model/providerTypes'

export function useProviders(role: ProviderRoleFilter = 'all') {
  return useQuery({
    queryKey: providerKeys.list(role),
    queryFn: () => fetchProviders(role),
  })
}
