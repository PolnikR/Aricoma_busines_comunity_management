import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProvider } from './providersApi'
import { providerKeys } from './providerQueryKeys'

export function useDeleteProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (providerId: string) => deleteProvider(providerId),
    onSuccess: (remaining) => {
      queryClient.setQueryData(providerKeys.list(), remaining)
    },
  })
}
