import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type { DiscoveryInventory } from '../model/discoveryTypes'
import { vmwareInventoryResponseSchema } from './schemas/vmwareInventorySchema'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'

export async function fetchVmwareInventory(providerId?: string, tag?: string): Promise<DiscoveryInventory> {
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  if (providerId) params.set('provider_id', providerId)
  const base = tag
    ? API_ENDPOINTS.discovery.virtualMachinesByTag
    : API_ENDPOINTS.discovery.virtualMachines
  const search = params.toString()
  const url = search ? `${base}?${search}` : base
  const response = await apiFetch(url)

  if (!response.ok) {
    throw new Error(`Discovery inventory request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return mapVmwareInventory(vmwareInventoryResponseSchema.parse(payload))
}
