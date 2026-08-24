import { getPowerVmGetPowerVmGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { PowerInventory } from '../model/discoveryTypes'
import { mapPowerInventory } from '../helpers/mapPowerInventory'
import { powerInventoryResponseSchema } from './schemas/powerInventorySchema'

// OpenAPI exposes Power LPAR and VIOS records as `unknown`. This local schema
// protects the mapper until those vendor-specific response models are declared.
export async function fetchPowerInventory(providerId?: string): Promise<PowerInventory> {
  try {
    const payload = await getPowerVmGetPowerVmGet(providerId ? { provider_id: providerId } : {})
    return mapPowerInventory(powerInventoryResponseSchema.parse(payload), providerId)
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`IBM Power inventory request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
