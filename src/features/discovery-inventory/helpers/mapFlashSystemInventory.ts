import type { FlashSystemInventory } from '../model/discoveryTypes'
import type { FlashSystemInventoryPayload } from '../api/schemas/flashSystemInventorySchema'
import { parseCapacityBytes } from '../resources/helpers/parseCapacity'

function normalizeIdentity(value: string | undefined): string {
  return value?.trim() ?? ''
}

function stableVolumeFingerprint(volume: FlashSystemInventoryPayload['volumes'][number]): string {
  const source = [
    volume.name,
    volume.mdisk_grp_id,
    volume.capacity,
    volume.IO_group_id,
  ].map(normalizeIdentity).join('|')

  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fallback-${(hash >>> 0).toString(36)}`
}

export function mapFlashSystemInventory(
  payload: FlashSystemInventoryPayload,
  providerId = '',
): FlashSystemInventory {
  const volumes = payload.volumes
  const inventoryProviderId = normalizeIdentity(payload.provider_id) || providerId
  const identityOccurrences = new Map<string, number>()
  const resources = volumes.map((volume, index) => {
    const resourceProviderId = normalizeIdentity(volume.provider_id) || inventoryProviderId
    const identity = [
      volume.id,
      volume.vdisk_UID,
      volume.volume_id,
    ].map(normalizeIdentity).find(Boolean) ?? stableVolumeFingerprint(volume)
    const identityKey = `${resourceProviderId}:${identity}`
    const occurrence = (identityOccurrences.get(identityKey) ?? 0) + 1
    identityOccurrences.set(identityKey, occurrence)

    return {
      ...volume,
      resourceId: occurrence === 1
        ? identityKey
        : `${identityKey}:${String(occurrence)}-${String(index)}`,
      providerId: resourceProviderId,
      providerType: 'FLASHCOPY' as const,
      pool: payload.pools[volume.mdisk_grp_id] ?? null,
      resolvedHostMaps: volume.host_maps.map((hostMap) => {
        const host = payload.hosts[hostMap.host_id]
        return {
          ...hostMap,
          hostName: host?.name ?? hostMap.host_id,
          clusterId: host?.cluster_id ?? null,
          clusterName: host?.cluster_name ?? '',
        }
      }),
      capacityBytes: parseCapacityBytes(volume.capacity),
    }
  })

  return {
    reportedCount: payload.count,
    volumes,
    resources,
    pools: payload.pools,
    hosts: payload.hosts,
    clusters: payload.clusters,
  }
}
