import { useQuery } from '@tanstack/react-query'
import { fetchCredentials } from '../api/credentialsApi'
import { credentialKeys } from '../api/credentialQueryKeys'

interface UseCredentialsOptions {
  enabled?: boolean
}

export function useCredentials({ enabled = true }: UseCredentialsOptions = {}) {
  return useQuery({
    queryKey: credentialKeys.list(),
    queryFn: fetchCredentials,
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
