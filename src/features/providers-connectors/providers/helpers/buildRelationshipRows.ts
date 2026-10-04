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
// provider, read left to right and complete on its own (a repeated partner is
// repeated in full), plus the partner relationships no compute row reaches.
export function buildRelationshipRows(topology: ProviderTopology): RelationshipRows {
  // Partner relationships rendered by compute rows; used only to select the leftovers.
  const rendered = new Set<PartnerRelationship>()

  const linkFrom = (storageId: string, relationship: PartnerRelationship): PartnerLink => {
    const outgoing = relationship.sourceId === storageId
    const otherId = outgoing ? relationship.targetId : relationship.sourceId
    rendered.add(relationship)
    return {
      relationship,
      otherId,
      other: outgoing ? relationship.target : findProvider(topology, otherId),
      direction: relationship.mutual ? 'both' : outgoing ? 'out' : 'in',
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
    .filter(relationship => !rendered.has(relationship))
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
