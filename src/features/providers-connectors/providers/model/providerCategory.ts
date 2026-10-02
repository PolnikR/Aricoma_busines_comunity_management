import type { ProviderType } from './providerTypes'

// Temporary FE classification that mirrors the current backend validation of
// provider relationships: only compute providers carry backingStorageProviderIds,
// which must reference storage providers, and partnerProviderId is FLASHCOPY-only.
// If the backend starts sending an explicit category or capabilities, that data
// takes precedence and replaces these lists.
export const COMPUTE_PROVIDER_TYPES = ['VMWARE', 'IBM_POWER'] as const satisfies readonly ProviderType[]
export const STORAGE_PROVIDER_TYPES = ['FLASHCOPY', 'HITACHI'] as const satisfies readonly ProviderType[]
export const PARTNER_PROVIDER_TYPES = ['FLASHCOPY'] as const satisfies readonly ProviderType[]

// Accept plain strings: form state holds the type as a string, '' before selection.
export function isComputeProviderType(type: string): boolean {
  return COMPUTE_PROVIDER_TYPES.some(known => known === type)
}

export function isStorageProviderType(type: string): boolean {
  return STORAGE_PROVIDER_TYPES.some(known => known === type)
}

export function isPartnerProviderType(type: string): boolean {
  return PARTNER_PROVIDER_TYPES.some(known => known === type)
}
