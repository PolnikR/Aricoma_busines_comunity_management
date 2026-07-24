import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProvider } from '@/features/api/providersApi'
import { providersQueryKey } from './useProviders'

export function useDeleteProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (providerId: string) => deleteProvider(providerId),
    onSuccess: (remaining) => {
      queryClient.setQueryData(providersQueryKey, remaining)
    },
  })
}
