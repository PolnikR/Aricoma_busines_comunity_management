import { useQuery } from '@tanstack/react-query'
import { fetchCredentials } from './credentialsApi'
import { credentialKeys } from './credentialQueryKeys'

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
