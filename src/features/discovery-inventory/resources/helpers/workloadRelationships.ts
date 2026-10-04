import type { RelationshipEdge, RelationshipEdgeKind } from '@/shared/components/relationship-graph'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { StorageVolume } from '../model/vmStorageVolumesTypes'

// What a drawn edge means, so the help can label it and describe it to screen readers.
export type WorkloadRelation = 'discovers' | 'backing' | 'flashCopy'

export interface WorkloadEdge extends RelationshipEdge {
  kind: RelationshipEdgeKind
  relation: WorkloadRelation
}

export interface ProviderEnd {
  entityId: string
  providerId: string
  // null when the id is not in the loaded provider list; the raw id is shown then.
  provider: ProviderRecord | null
}

export interface FlashCopyEnd {
  entityId: string
  snapshotCount: number
  // Peer volume names as reported by the mappings: targets of source mappings,
  // sources of target mappings.
  targets: string[]
  sources: string[]
}

export interface BackingVolumeRow {
  entityId: string
  volume: StorageVolume
  // null when the volume has no FlashCopy mappings; it is still shown.
  flashCopy: FlashCopyEnd | null
}

export interface BackingStorageGroup {
  storage: ProviderEnd
  rows: BackingVolumeRow[]
}

export interface WorkloadRelationships<Workload> {
  computeProvider: ProviderEnd
  workload: Workload & { entityId: string }
  groups: BackingStorageGroup[]
  edges: WorkloadEdge[]
}

const providerEnd = (providerId: string, providers: readonly ProviderRecord[]): ProviderEnd => ({
  entityId: `provider:${providerId}`,
  providerId,
  provider: providers.find(provider => provider.id === providerId) ?? null,
})

// Compute provider → workload → backing volumes (grouped by their storage provider,
// in API order) → FlashCopy. Only what the backing-storage lookup reports is drawn:
// nothing links a single virtual disk to a volume.
export function buildWorkloadRelationships<Workload>(
  computeProviderId: string,
  workload: Workload & { entityId: string },
  volumes: readonly StorageVolume[],
  providers: readonly ProviderRecord[],
): WorkloadRelationships<Workload> {
  const computeProvider = providerEnd(computeProviderId, providers)
  const edges: WorkloadEdge[] = [{ from: computeProvider.entityId, to: workload.entityId, kind: 'neutral', relation: 'discovers' }]
  const groups = new Map<string, BackingStorageGroup>()

  for (const volume of volumes) {
    const entityId = `volume:${volume.key}`
    const { sourceMappings, targetMappings, snapshotCount } = volume.snapshots
    const flashCopy = sourceMappings.length + targetMappings.length > 0
      ? {
          entityId: `flashcopy:${volume.key}`,
          snapshotCount,
          targets: sourceMappings.map(mapping => mapping.targetVdiskName),
          sources: targetMappings.map(mapping => mapping.sourceVdiskName),
        }
      : null
    edges.push({ from: workload.entityId, to: entityId, kind: 'backing', relation: 'backing' })
    if (flashCopy) edges.push({ from: entityId, to: flashCopy.entityId, kind: 'neutral', relation: 'flashCopy' })

    const group = groups.get(volume.storageProviderId) ?? { storage: providerEnd(volume.storageProviderId, providers), rows: [] }
    group.rows.push({ entityId, volume, flashCopy })
    groups.set(volume.storageProviderId, group)
  }

  return { computeProvider, workload, groups: [...groups.values()], edges }
}
