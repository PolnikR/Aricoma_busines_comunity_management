import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDiscoveryCacheConfig } from '../api/discoveryCacheApi'
import { discoveryCacheKeys } from '../api/discoveryCacheQueryKeys'

export function useUpdateDiscoveryCacheConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDiscoveryCacheConfig,
    onSuccess: config => queryClient.setQueryData(discoveryCacheKeys.config(), config),
  })
}
