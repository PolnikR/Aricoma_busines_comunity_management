import type { RelationshipEdge, RelationshipEdgeKind } from '@/shared/components/relationship-graph'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { buildSelectedProviderRelationships } from '@/features/providers-connectors/providers/helpers/buildSelectedProviderRelationships'
import type { PartnerLane } from '@/features/providers-connectors/providers/helpers/buildSelectedProviderRelationships'
import type { FlashSystemVolumeResource } from '../model/discoveryTypes'

export type FlashVolumeRelation = 'contains' | 'mappedTo' | 'memberOf' | 'flashCopy' | 'remoteCopy' | 'partner'

export interface FlashVolumeEdge extends RelationshipEdge {
  kind: RelationshipEdgeKind
  relation: FlashVolumeRelation
}

// FlashSystem fields arrive as strings; empty and '-' mean "not reported".
const reported = (value: unknown): value is string => typeof value === 'string' && value !== '' && value !== '-'

export function buildFlashVolumeRelationships(volume: FlashSystemVolumeResource, allProviders: readonly ProviderRecord[]) {
  const scope = `${volume.providerId}:`
  const provider = {
    entityId: `provider:${volume.providerId}`,
    providerId: volume.providerId,
    provider: allProviders.find(candidate => candidate.id === volume.providerId) ?? null,
  }
  const poolName = [volume.pool?.name, volume.mdisk_grp_name, volume.mdisk_grp_id].find(reported)
  const pool = poolName
    ? { entityId: `pool:${scope}${volume.mdisk_grp_id || poolName}`, name: poolName, capacity: volume.pool?.capacity ?? '' }
    : null
  const node = {
    entityId: `volume:${volume.resourceId}`,
    name: volume.name || volume.volume_name || volume.id,
    volumeId: volume.volume_id || volume.id,
    uid: volume.vdisk_UID,
    capacity: volume.capacity,
    status: volume.status,
  }
  const hosts = volume.resolvedHostMaps.map(map => ({
    entityId: `host:${scope}${map.host_id}`,
    name: map.hostName,
    clusterName: map.clusterName,
    scsiId: map.scsi_id,
  }))
  const consistencyGroups = volume.resolvedConsistencyGroups.map(group => ({
    entityId: `consistency-group:${scope}${group.id}`,
    name: group.name,
    status: group.status,
  }))
  const mapCount = Number(volume.fc_map_count) || 0
  // FlashCopy only when the volume reports a mapping; its target is not in this payload.
  const flashCopy = mapCount > 0 || reported(volume.FC_id)
    ? { entityId: `flashcopy:${volume.resourceId}`, mapCount, fcId: reported(volume.FC_id) ? volume.FC_id : '', fcName: reported(volume.FC_name) ? volume.FC_name : '' }
    : null
  // Remote Copy only from the volume's own RC fields; the target volume and system
  // are not reported, and a configured provider partner does not prove replication.
  const remoteCopy = reported(volume.RC_id)
    ? { entityId: `remote-copy:${volume.resourceId}`, rcId: volume.RC_id, rcName: reported(volume.RC_name) ? volume.RC_name : '' }
    : null
  const providerRelationships = buildSelectedProviderRelationships(allProviders, volume.providerId)
  const partners: PartnerLane[] = providerRelationships.kind === 'storage' ? providerRelationships.partners : []

  const edges: FlashVolumeEdge[] = []
  if (pool) {
    edges.push({ from: provider.entityId, to: pool.entityId, kind: 'neutral', relation: 'contains' })
    edges.push({ from: pool.entityId, to: node.entityId, kind: 'neutral', relation: 'contains' })
  } else {
    edges.push({ from: provider.entityId, to: node.entityId, kind: 'neutral', relation: 'contains' })
  }
  for (const host of hosts) edges.push({ from: node.entityId, to: host.entityId, kind: 'neutral', relation: 'mappedTo' })
  for (const group of consistencyGroups) edges.push({ from: node.entityId, to: group.entityId, kind: 'neutral', relation: 'memberOf' })
  if (flashCopy) edges.push({ from: node.entityId, to: flashCopy.entityId, kind: 'neutral', relation: 'flashCopy' })
  if (remoteCopy) edges.push({ from: node.entityId, to: remoteCopy.entityId, kind: 'neutral', relation: 'remoteCopy' })
  for (const lane of partners) edges.push({ from: lane.edge.from, to: lane.edge.to, kind: lane.edge.kind, relation: 'partner' })

  return { provider, pool, volume: node, hosts, consistencyGroups, flashCopy, remoteCopy, partners, edges }
}

export type FlashVolumeRelationships = ReturnType<typeof buildFlashVolumeRelationships>
