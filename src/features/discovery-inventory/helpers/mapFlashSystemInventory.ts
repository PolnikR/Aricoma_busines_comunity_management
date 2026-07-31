import type { FlashSystemInventory } from '../model/discoveryTypes'
import type { FlashSystemInventoryPayload } from '../api/schemas/flashSystemInventorySchema'
import { parseCapacityBytes } from '../resources/helpers/parseCapacity'

export function mapFlashSystemInventory(
  payload: FlashSystemInventoryPayload,
  providerId = '',
): FlashSystemInventory {
  const volumes = payload.volumes
  const resources = volumes.map((volume) => ({
    ...volume,
    resourceId: `${providerId}:${volume.id}`,
    providerId,
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
  }))

  return {
    reportedCount: payload.count,
    volumes,
    resources,
    pools: payload.pools,
    hosts: payload.hosts,
    clusters: payload.clusters,
  }
}
