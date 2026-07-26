import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitProvider } from './providersApi'
import { providerKeys } from './providerQueryKeys'
import type { ProviderRecord } from '../model/providerTypes'

interface UpsertProviderVars {
  provider: ProviderRecord
  existingProviders: ProviderRecord[]
}

// Creates or edits a provider. The backend upserts by id from a single provider
// object; on success we mirror that upsert into the providers cache (replace the
// entry sharing the id, otherwise append).
export function useUpsertProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider }: UpsertProviderVars) => submitProvider(provider),
    onSuccess: (_data, { provider, existingProviders }) => {
      const others = existingProviders.filter((entry) => entry.id !== provider.id)
      queryClient.setQueryData(providerKeys.list(), [...others, provider])
    },
  })
}
