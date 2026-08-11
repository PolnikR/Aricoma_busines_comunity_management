import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type { FlashSystemInventory } from '../model/discoveryTypes'
import { mapFlashSystemInventory } from '../helpers/mapFlashSystemInventory'
import { flashSystemInventoryResponseSchema } from './schemas/flashSystemInventorySchema'

export async function fetchFlashSystemInventory(providerId?: string): Promise<FlashSystemInventory> {
  const url = providerId
    ? `${API_ENDPOINTS.discovery.flashSystemVolumes}?${new URLSearchParams({ provider_id: providerId }).toString()}`
    : API_ENDPOINTS.discovery.flashSystemVolumes
  const response = await apiFetch(url)
  if (!response.ok) {
    throw new Error(`IBM FlashSystem inventory request failed with status ${String(response.status)}`)
  }
  const payload: unknown = await response.json()
  return mapFlashSystemInventory(flashSystemInventoryResponseSchema.parse(payload), providerId)
}
