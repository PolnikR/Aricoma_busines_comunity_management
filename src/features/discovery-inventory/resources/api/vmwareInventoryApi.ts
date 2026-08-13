import { vmsByTagVmsByTagGet, vmsVmsGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { DiscoveryInventory } from '../model/discoveryTypes'
import { vmwareInventoryResponseSchema } from './schemas/vmwareInventorySchema'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'

export async function fetchVmwareInventory(providerId?: string, tag?: string): Promise<DiscoveryInventory> {
  try {
    const payload = tag
      ? await vmsByTagVmsByTagGet({ ...(tag ? { tag } : {}), ...(providerId ? { provider_id: providerId } : {}) })
      : await vmsVmsGet(providerId ? { provider_id: providerId } : {})
    return mapVmwareInventory(vmwareInventoryResponseSchema.parse(payload))
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Discovery inventory request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
