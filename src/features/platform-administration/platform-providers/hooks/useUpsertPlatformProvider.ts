import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitPlatformProvider } from '../api/platformProvidersApi'
import { platformProviderKeys } from '../api/platformProviderQueryKeys'
import type { PlatformProviderSubmitData } from '../model/platformProviderTypes'

interface UpsertPlatformProviderVariables {
  provider: PlatformProviderSubmitData
}

export function useUpsertPlatformProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider }: UpsertPlatformProviderVariables) => submitPlatformProvider(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformProviderKeys.list() }),
  })
}
