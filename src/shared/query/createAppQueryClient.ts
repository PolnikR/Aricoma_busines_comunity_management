import { MutationCache, QueryClient } from '@tanstack/react-query'
import { STANDARD_QUERY_OPTIONS } from './cachePolicy'
import { invalidateProviderMutation } from './providerMutationInvalidation'

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS } },
    mutationCache: new MutationCache({
      onSuccess: (_data, variables, _result, mutation, context) =>
        invalidateProviderMutation(context.client, mutation.options.mutationKey, variables),
    }),
  })
}
