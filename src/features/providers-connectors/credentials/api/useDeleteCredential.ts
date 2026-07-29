import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCredential } from './credentialsApi'
import { credentialKeys } from './credentialQueryKeys'

export function useDeleteCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCredential,
    onSuccess: (credentials) => {
      queryClient.setQueryData(credentialKeys.list(), credentials)
    },
  })
}
