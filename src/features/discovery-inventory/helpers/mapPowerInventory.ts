import type { PowerInventory } from '../model/discoveryTypes'
import type { PowerInventoryPayload } from '../api/schemas/powerInventorySchema'

export function mapPowerInventory(payload: PowerInventoryPayload): PowerInventory {
  return {
    reportedCount: payload.count,
    countsByType: payload.counts_by_type,
    virtualMachines: payload.vms,
  }
}
