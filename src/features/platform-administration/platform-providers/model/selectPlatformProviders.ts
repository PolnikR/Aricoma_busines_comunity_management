import type { PlatformProvidersResponse, PlatformProvidersResponseOutput } from '@/generated/query/zod'
import { isPlatformProviderType } from './platformProviderTypes'

// Non-platform provider types are skipped instead of failing the list.
// flatMap keeps the narrowed `type` on each record, which a plain filter would lose.
const selectPlatformProviderRecords = (response: PlatformProvidersResponseOutput) => response.providers
  .flatMap(provider => isPlatformProviderType(provider.type)
    ? [{ ...provider, type: provider.type, credentialStatus: provider.credentialStatus ?? 'none' }]
    : [])

// validatingMutator parses the response through the zod schema before handing it to
// react-query, so select receives the Output shape (defaults applied) even though the
// generated hook declares the Input shape. The cast keeps the accurate Output types.
export const selectPlatformProviders = selectPlatformProviderRecords as
  (response: PlatformProvidersResponse) => ReturnType<typeof selectPlatformProviderRecords>
