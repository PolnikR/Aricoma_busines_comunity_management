import { useMutation } from '@tanstack/react-query'
import { mockTestProviderConnection } from '../api/mockProviderConnectionTest'
import type { ProviderRecord } from '../model/providerTypes'

export function useTestProviderConnection() {
  return useMutation({
    mutationFn: (provider: ProviderRecord) => mockTestProviderConnection(provider),
    retry: false,
  })
}
