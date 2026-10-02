import type { ProviderRecord } from '../model/providerTypes'
import type { BackingStorageRelationship, PartnerRelationship, ProviderTopology } from './resolveProviderTopology'

// `both` only for a mutual partnership; otherwise the direction declared in the data,
// seen from the storage provider the row starts from.
export type PartnerDirection = 'both' | 'out' | 'in'

export interface PartnerLink {
  relationship: PartnerRelationship
  otherId: string
  other: ProviderRecord | null
  direction: PartnerDirection
  // The first occurrence in reading order is shown in full, later ones as a compact reference.
  display: 'full' | 'compact'
}

export interface RelationshipTarget {
  relationship: BackingStorageRelationship
  partner: PartnerLink | null
}

export interface ComputeRelationshipRow {
  provider: ProviderRecord
  targets: RelationshipTarget[]
}

export interface StorageRelationshipRow {
  provider: ProviderRecord
  partner: PartnerLink
}

export interface RelationshipRows {
  computeRows: ComputeRelationshipRow[]
  // Partner relationships not reachable from any compute row.
  otherStorageRows: StorageRelationshipRow[]
}

// View model for the relationship rows of the provider help: one row per compute
// provider, read left to right, plus the partner relationships left over.
export function buildRelationshipRows(topology: ProviderTopology): RelationshipRows {
  const shown = new Set<PartnerRelationship>()

  const linkFrom = (storageId: string, relationship: PartnerRelationship): PartnerLink => {
    const outgoing = relationship.sourceId === storageId
    const otherId = outgoing ? relationship.targetId : relationship.sourceId
    const display = shown.has(relationship) ? 'compact' : 'full'
    shown.add(relationship)
    return {
      relationship,
      otherId,
      other: outgoing ? relationship.target : findProvider(topology, otherId),
      direction: relationship.mutual ? 'both' : outgoing ? 'out' : 'in',
      display,
    }
  }

  const computeRows = topology.computeProviders.map(provider => ({
    provider,
    targets: topology.backingStorage
      .filter(relationship => relationship.sourceId === provider.id)
      .map(relationship => {
        const partner = relationship.status === 'resolved'
          ? topology.partners.find(candidate => candidate.sourceId === relationship.targetId || candidate.targetId === relationship.targetId)
          : undefined
        return { relationship, partner: partner ? linkFrom(relationship.targetId, partner) : null }
      }),
  }))

  const otherStorageRows = topology.partners
    .filter(relationship => !shown.has(relationship))
    .flatMap(relationship => {
      const source = findProvider(topology, relationship.sourceId)
      return source ? [{ provider: source, partner: linkFrom(source.id, relationship) }] : []
    })

  return { computeRows, otherStorageRows }
}

function findProvider(topology: ProviderTopology, id: string): ProviderRecord | null {
  return topology.storageProviders.find(provider => provider.id === id)
    ?? topology.computeProviders.find(provider => provider.id === id)
    ?? null
}
