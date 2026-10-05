import type { RelationshipDirection, RelationshipEdge, RelationshipEdgeKind } from '@/shared/components/relationship-graph'
import { isComputeProviderType, isPartnerProviderType } from '../model/providerCategory'
import type { ProviderRecord } from '../model/providerTypes'
import { resolveProviderTopology } from './resolveProviderTopology'
import type { BackingStorageRelationship, PartnerRelationship, RelationshipStatus } from './resolveProviderTopology'

// One side of a relationship as drawn: a provider card, or a problem card for an
// id that is missing or of the wrong type. Nothing is corrected or completed.
export type RelationshipEnd =
  | { kind: 'provider'; entityId: string; provider: ProviderRecord }
  | { kind: 'problem'; entityId: string; providerId: string; status: Exclude<RelationshipStatus, 'resolved'>; provider: ProviderRecord | null }

export interface DrawnEdge extends RelationshipEdge {
  kind: RelationshipEdgeKind
  // Reading direction from `from` to `to`.
  direction: RelationshipDirection
  // 'backing' or 'partner': what the edge is, also when it is a problem edge.
  relation: 'backing' | 'partner'
  status: RelationshipStatus
}

export interface PartnerLane {
  edge: DrawnEdge
  other: RelationshipEnd
}

// Selected compute provider: one row per backing storage, the storage's partners
// continue the row.
export interface ComputeBackingRow {
  edge: DrawnEdge
  storage: RelationshipEnd
  partners: PartnerLane[]
}

// Selected storage provider: one row per compute provider that uses it.
export interface StorageConsumerRow {
  edge: DrawnEdge
  consumer: RelationshipEnd
}

export type SelectedProviderRelationships =
  | {
    kind: 'compute'
    selected: RelationshipEnd & { kind: 'provider' }
    backing: ComputeBackingRow[]
    // A compute provider has no partners by contract; any here are mismatches.
    partners: PartnerLane[]
    edges: DrawnEdge[]
  }
  | {
    kind: 'storage'
    selected: RelationshipEnd & { kind: 'provider' }
    consumers: StorageConsumerRow[]
    partners: PartnerLane[]
    // False for storage types without partner relationships (HITACHI).
    partnerSupported: boolean
    edges: DrawnEdge[]
  }
  | { kind: 'missing' }

export const providerEntityId = (id: string) => `provider:${id}`
const problemEntityId = (id: string) => `problem:${id}`

function end(providerId: string, provider: ProviderRecord | null, status: RelationshipStatus): RelationshipEnd {
  if (status === 'resolved' && provider) return { kind: 'provider', entityId: providerEntityId(providerId), provider }
  return { kind: 'problem', entityId: problemEntityId(providerId), providerId, status: status === 'resolved' ? 'unresolved' : status, provider }
}

// The selected provider's immediate relationship neighbourhood, resolved against
// the whole provider list. Unrelated providers and the partner's own neighbours
// are left out on purpose.
export function buildSelectedProviderRelationships(
  allProviders: readonly ProviderRecord[],
  selectedProviderId: string,
): SelectedProviderRelationships {
  const byId = new Map(allProviders.map(provider => [provider.id, provider]))
  const selectedProvider = byId.get(selectedProviderId)
  if (!selectedProvider) return { kind: 'missing' }

  const topology = resolveProviderTopology(allProviders)
  const selected = { kind: 'provider' as const, entityId: providerEntityId(selectedProvider.id), provider: selectedProvider }
  const edges: DrawnEdge[] = []
  const draw = (edge: DrawnEdge) => { edges.push(edge); return edge }

  // Partner relationships of one storage provider, read from that provider's side.
  const partnersOf = (providerId: string, fromEntityId: string): PartnerLane[] => topology.partners
    .filter(relationship => relationship.sourceId === providerId || relationship.targetId === providerId)
    .map((relationship: PartnerRelationship) => {
      const outgoing = relationship.sourceId === providerId
      const otherId = outgoing ? relationship.targetId : relationship.sourceId
      const other = end(otherId, outgoing ? relationship.target : byId.get(otherId) ?? null, relationship.status)
      const direction: RelationshipDirection = relationship.mutual ? 'both' : outgoing ? 'forward' : 'backward'
      const kind: RelationshipEdgeKind = relationship.status === 'resolved' ? 'partner' : 'problem'
      return { edge: draw({ from: fromEntityId, to: other.entityId, kind, direction, relation: 'partner', status: relationship.status }), other }
    })

  if (isComputeProviderType(selectedProvider.type)) {
    const backing = topology.backingStorage
      .filter(relationship => relationship.sourceId === selectedProvider.id)
      .map((relationship: BackingStorageRelationship): ComputeBackingRow => {
        const storage = end(relationship.targetId, relationship.target, relationship.status)
        const kind: RelationshipEdgeKind = relationship.status === 'resolved' ? 'backing' : 'problem'
        const edge = draw({ from: selected.entityId, to: storage.entityId, kind, direction: 'forward', relation: 'backing', status: relationship.status })
        return { edge, storage, partners: storage.kind === 'provider' ? partnersOf(storage.provider.id, storage.entityId) : [] }
      })
    return { kind: 'compute', selected, backing, partners: partnersOf(selectedProvider.id, selected.entityId), edges }
  }

  const consumers = topology.backingStorage
    .filter(relationship => relationship.targetId === selectedProvider.id)
    .map((relationship): StorageConsumerRow => {
      const source = byId.get(relationship.sourceId) ?? null
      const consumer = end(relationship.sourceId, source, relationship.status)
      const kind: RelationshipEdgeKind = relationship.status === 'resolved' ? 'backing' : 'problem'
      return { edge: draw({ from: consumer.entityId, to: selected.entityId, kind, direction: 'forward', relation: 'backing', status: relationship.status }), consumer }
    })
  return {
    kind: 'storage',
    selected,
    consumers,
    partners: partnersOf(selectedProvider.id, selected.entityId),
    partnerSupported: isPartnerProviderType(selectedProvider.type),
    edges,
  }
}
