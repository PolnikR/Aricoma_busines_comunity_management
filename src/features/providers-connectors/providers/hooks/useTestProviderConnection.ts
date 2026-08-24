import { useMutation } from '@tanstack/react-query'
import { testProviderConnection } from '../api/providersApi'
import type { ProviderRecord } from '../model/providerTypes'

export function useTestProviderConnection() {
  return useMutation({
    mutationFn: (provider: ProviderRecord) => testProviderConnection(provider.id),
    retry: false,
  })
}
