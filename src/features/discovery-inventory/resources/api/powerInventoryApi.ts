import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type { PowerInventory } from '../model/discoveryTypes'
import { mapPowerInventory } from '../helpers/mapPowerInventory'
import { powerInventoryResponseSchema } from './schemas/powerInventorySchema'

async function fetchProviderPayload(providerId: string | undefined): Promise<unknown> {
  const url = providerId
    ? `${API_ENDPOINTS.discovery.powerVirtualMachines}?${new URLSearchParams({ provider_id: providerId }).toString()}`
    : API_ENDPOINTS.discovery.powerVirtualMachines
  const response = await apiFetch(url)
  if (!response.ok) {
    throw new Error(`IBM Power inventory request failed with status ${String(response.status)}`)
  }
  return response.json()
}

export async function fetchPowerInventory(providerId?: string): Promise<PowerInventory> {
  const payload = await fetchProviderPayload(providerId)
  return mapPowerInventory(powerInventoryResponseSchema.parse(payload), providerId)
}
