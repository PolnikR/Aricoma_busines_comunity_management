import { vmsByTagVmsByTagGet, vmsVmsGet } from '@/generated/api/client.gen'
import { VmsResponse } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { DiscoveryInventory } from '../model/discoveryTypes'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'

export async function fetchVmwareInventory(providerId?: string, tag?: string): Promise<DiscoveryInventory> {
  try {
    const payload = tag
      ? await vmsByTagVmsByTagGet({ ...(tag ? { tag } : {}), ...(providerId ? { provider_id: providerId } : {}) })
      : await vmsVmsGet(providerId ? { provider_id: providerId } : {})
    return mapVmwareInventory(parseGeneratedResponse(
      VmsResponse,
      payload,
      tag ? 'GET /vms_by_tag' : 'GET /vms',
    ))
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Discovery inventory request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
