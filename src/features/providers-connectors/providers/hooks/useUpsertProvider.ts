import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitProvider } from '../api/providersApi'
import { providerKeys } from '../api/providerQueryKeys'
import type { ProviderSubmitData } from '../model/providerTypes'

interface UpsertProviderVars {
  provider: ProviderSubmitData
}

// The submit endpoint does not return the normalized provider record. Invalidate
// the list so credentialStatus always comes from the backend.
export function useUpsertProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider }: UpsertProviderVars) => submitProvider(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: providerKeys.list() }),
  })
}
