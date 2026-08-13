import { getVolumesRouteGetVolumesGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { FlashSystemInventory } from '../model/discoveryTypes'
import { mapFlashSystemInventory } from '../helpers/mapFlashSystemInventory'
import { flashSystemInventoryResponseSchema } from './schemas/flashSystemInventorySchema'

// OpenAPI exposes FlashSystem volume, pool and host records as `unknown`.
// Retain feature validation until the backend contract describes these records.
export async function fetchFlashSystemInventory(providerId?: string): Promise<FlashSystemInventory> {
  try {
    const payload = await getVolumesRouteGetVolumesGet(providerId ? { provider_id: providerId } : {})
    return mapFlashSystemInventory(flashSystemInventoryResponseSchema.parse(payload), providerId)
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`IBM FlashSystem inventory request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
