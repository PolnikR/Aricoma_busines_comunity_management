import { useQuery } from '@tanstack/react-query'
import { fetchProviders } from '@/features/api/providersApi'

export const providersQueryKey = ['providers'] as const

export function useProviders() {
  return useQuery({
    queryKey: providersQueryKey,
    queryFn: fetchProviders,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
