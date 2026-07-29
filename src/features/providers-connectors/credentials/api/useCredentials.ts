import { useQuery } from '@tanstack/react-query'
import { fetchCredentials } from './credentialsApi'
import { credentialKeys } from './credentialQueryKeys'

export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.list(),
    queryFn: fetchCredentials,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
