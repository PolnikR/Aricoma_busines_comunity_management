import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProvider } from '../api/providersApi'
import { providerKeys } from '../api/providerQueryKeys'

export function useDeleteProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (providerId: string) => deleteProvider(providerId),
    onSuccess: (remaining) => {
      queryClient.setQueryData(providerKeys.list('all'), remaining)
      void queryClient.invalidateQueries({ queryKey: providerKeys.all })
    },
  })
}
