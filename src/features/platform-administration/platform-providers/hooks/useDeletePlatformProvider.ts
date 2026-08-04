import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePlatformProvider } from '../api/platformProvidersApi'
import { platformProviderKeys } from '../api/platformProviderQueryKeys'

export function useDeletePlatformProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (providerId: string) => deletePlatformProvider(providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformProviderKeys.list() }),
  })
}
