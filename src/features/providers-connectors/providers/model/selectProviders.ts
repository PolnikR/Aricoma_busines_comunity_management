import type { ProvidersResponse, ProvidersResponseOutput } from '@/generated/query/zod'
import { PROVIDER_TYPES, type ProviderType } from './providerTypes'

const isInfrastructureType = (type: string): type is ProviderType => PROVIDER_TYPES.some(known => known === type)

// Unknown (non-infrastructure) provider types are skipped instead of failing the list.
// flatMap keeps the narrowed `type` on each record, which a plain filter would lose.
const selectInfrastructureProviders = (response: ProvidersResponseOutput) => response.providers
  .flatMap(provider => isInfrastructureType(provider.type)
    ? [{ ...provider, type: provider.type, credentialStatus: provider.credentialStatus ?? 'none' }]
    : [])

// validatingMutator parses the response through the zod schema before handing it to
// react-query, so select receives the Output shape (defaults applied) even though the
// generated hook declares the Input shape. The cast keeps the accurate Output types.
export const selectProviders = selectInfrastructureProviders as
  (response: ProvidersResponse) => ReturnType<typeof selectInfrastructureProviders>
