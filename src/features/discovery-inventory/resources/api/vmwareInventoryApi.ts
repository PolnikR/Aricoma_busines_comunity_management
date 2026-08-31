import { vmsSearchVmsSearchPost } from '@/generated/api/client.gen'
import { VmsResponse, type VmSearchFilter } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { DiscoveryInventory } from '../model/discoveryTypes'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'

export interface VmwareInventorySearch {
  providerId?: string
  folderName?: string
  tag?: string
  namePrefix?: string
  forceRefresh?: boolean
}

export function normalizeVmwareInventorySearch(
  search: VmwareInventorySearch = {},
): VmwareInventorySearch {
  const normalized: VmwareInventorySearch = {}
  const stringFields = [
    ['providerId', search.providerId],
    ['folderName', search.folderName],
    ['tag', search.tag],
    ['namePrefix', search.namePrefix],
  ] as const

  for (const [field, value] of stringFields) {
    const trimmed = value?.trim()
    if (trimmed) normalized[field] = trimmed
  }

  if (search.forceRefresh !== undefined) normalized.forceRefresh = search.forceRefresh
  return normalized
}

export async function fetchVmwareInventory(
  search: VmwareInventorySearch = {},
): Promise<DiscoveryInventory> {
  try {
    const normalized = normalizeVmwareInventorySearch(search)
    const body = {
      ...(normalized.folderName ? { folder_name: normalized.folderName } : {}),
      ...(normalized.tag ? { tag: normalized.tag } : {}),
      ...(normalized.namePrefix ? { name_prefix: normalized.namePrefix } : {}),
      ...(normalized.forceRefresh !== undefined ? { force_refresh: normalized.forceRefresh } : {}),
    } satisfies VmSearchFilter
    const payload = await vmsSearchVmsSearchPost(
      body,
      normalized.providerId ? { provider_id: normalized.providerId } : undefined,
    )
    return mapVmwareInventory(parseGeneratedResponse(
      VmsResponse,
      payload,
      'POST /vms/search',
    ))
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Discovery inventory request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
