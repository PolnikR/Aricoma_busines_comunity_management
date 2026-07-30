import type { FlashSystemInventory } from '../model/discoveryTypes'
import type { FlashSystemInventoryPayload } from '../api/schemas/flashSystemInventorySchema'

export function mapFlashSystemInventory(
  payload: FlashSystemInventoryPayload,
): FlashSystemInventory {
  return {
    reportedCount: payload.count,
    volumes: payload.volumes,
    pools: payload.pools,
    hosts: payload.hosts,
    clusters: payload.clusters,
  }
}
