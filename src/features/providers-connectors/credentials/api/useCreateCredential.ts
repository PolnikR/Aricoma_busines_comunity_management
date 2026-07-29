import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CredentialSubmitPayload } from '../model/credentialTypes'
import { submitCredential } from './credentialsApi'
import { credentialKeys } from './credentialQueryKeys'

export function useCreateCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CredentialSubmitPayload) => submitCredential(payload),
    onSuccess: (credentials) => {
      queryClient.setQueryData(credentialKeys.list(), credentials)
    },
  })
}
