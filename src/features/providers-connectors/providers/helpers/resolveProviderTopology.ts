import type { ProviderRecord } from '../model/providerTypes'
import { isComputeProviderType, isPartnerProviderType, isStorageProviderType } from '../model/providerCategory'

export type RelationshipStatus = 'resolved' | 'unresolved' | 'mismatch'

export interface BackingStorageRelationship {
  sourceId: string
  targetId: string
  // null when no provider with targetId exists
  target: ProviderRecord | null
  status: RelationshipStatus
}

export interface PartnerRelationship {
  // Provider whose partnerProviderId declared the link (first in API order when mutual)
  sourceId: string
  targetId: string
  target: ProviderRecord | null
  status: RelationshipStatus
  // True only when both sides point at each other
  mutual: boolean
}

export interface ProviderTopology {
  computeProviders: ProviderRecord[]
  storageProviders: ProviderRecord[]
  backingStorage: BackingStorageRelationship[]
  partners: PartnerRelationship[]
}

// Builds the relationship topology purely from the provider list, joined by id.
// Relationships that break the current backend contract (legacy or manually
// edited data) are kept and marked instead of being dropped or corrected.
export function resolveProviderTopology(providers: readonly ProviderRecord[]): ProviderTopology {
  const byId = new Map(providers.map(provider => [provider.id, provider]))

  const backingStorage = providers.flatMap(source => (source.backingStorageProviderIds ?? []).map((targetId): BackingStorageRelationship => {
    const target = byId.get(targetId) ?? null
    const status = !target
      ? 'unresolved'
      : isComputeProviderType(source.type) && isStorageProviderType(target.type) ? 'resolved' : 'mismatch'
    return { sourceId: source.id, targetId, target, status }
  }))

  const partners: PartnerRelationship[] = []
  const byPair = new Map<string, PartnerRelationship>()
  for (const source of providers) {
    const targetId = source.partnerProviderId
    if (!targetId) continue
    const pairKey = [source.id, targetId].sort().join('\n')
    const existing = byPair.get(pairKey)
    if (existing && existing.sourceId !== source.id) {
      existing.mutual = true
      continue
    }
    const target = byId.get(targetId) ?? null
    const status = !target
      ? 'unresolved'
      : targetId !== source.id && isPartnerProviderType(source.type) && isPartnerProviderType(target.type) ? 'resolved' : 'mismatch'
    const relationship: PartnerRelationship = { sourceId: source.id, targetId, target, status, mutual: false }
    byPair.set(pairKey, relationship)
    partners.push(relationship)
  }

  return {
    computeProviders: providers.filter(provider => isComputeProviderType(provider.type)),
    storageProviders: providers.filter(provider => isStorageProviderType(provider.type)),
    backingStorage,
    partners,
  }
}
