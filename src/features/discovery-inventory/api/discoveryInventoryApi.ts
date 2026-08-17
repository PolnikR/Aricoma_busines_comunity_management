import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  DiscoveryInventory,
  FlashSystemInventory,
  PowerInventory,
} from '../model/discoveryTypes'
import { vmwareInventoryResponseSchema } from './schemas/vmwareInventorySchema'
import { powerInventoryResponseSchema } from './schemas/powerInventorySchema'
import { flashSystemInventoryResponseSchema } from './schemas/flashSystemInventorySchema'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'
import { mapPowerInventory } from '../helpers/mapPowerInventory'
import { mapFlashSystemInventory } from '../helpers/mapFlashSystemInventory'

export async function fetchVmwareInventory(providerId?: string, tag?: string): Promise<DiscoveryInventory> {
  // A tag selects the by-tag endpoint; provider is an optional extra param on
  // either endpoint.
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  if (providerId) params.set('provider_id', providerId)
  const base = tag
    ? API_ENDPOINTS.discovery.virtualMachinesByTag
    : API_ENDPOINTS.discovery.virtualMachines
  const search = params.toString()
  const url = search ? `${base}?${search}` : base

  const response = await apiFetch(url)

  // A filtered 400 currently represents an unsupported provider/tag
  // combination. Server failures must remain errors and must never look like
  // a successfully empty inventory.
  if (response.status === 400 && (providerId || tag)) {
    return { reportedCount: 0, virtualMachines: [] }
  }

  if (!response.ok) {
    throw new Error(`Discovery inventory request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = vmwareInventoryResponseSchema.parse(payload)
  return mapVmwareInventory(parsed)
}

async function fetchProviderPayload(url: string, providerId: string | undefined, label: string): Promise<unknown> {
  const requestUrl = providerId
    ? `${url}?${new URLSearchParams({ provider_id: providerId }).toString()}`
    : url
  const response = await apiFetch(requestUrl)

  if (!response.ok) {
    throw new Error(`${label} inventory request failed with status ${String(response.status)}`)
  }

  return response.json()
}

export async function fetchPowerInventory(providerId?: string): Promise<PowerInventory> {
  const payload = await fetchProviderPayload(
    API_ENDPOINTS.discovery.powerVirtualMachines,
    providerId,
    'IBM Power',
  )
  const parsed = powerInventoryResponseSchema.parse(payload)
  return mapPowerInventory(parsed, providerId)
}

export async function fetchFlashSystemInventory(providerId?: string): Promise<FlashSystemInventory> {
  const payload = await fetchProviderPayload(
    API_ENDPOINTS.discovery.flashSystemVolumes,
    providerId,
    'IBM FlashSystem',
  )
  const parsed = flashSystemInventoryResponseSchema.parse(payload)
  return mapFlashSystemInventory(parsed, providerId)
}

export type ProviderInventory =
  | { source: 'vmware'; provider: ProviderRecord; inventory: DiscoveryInventory }
  | { source: 'power'; provider: ProviderRecord; inventory: PowerInventory }
  | { source: 'flashsystem'; provider: ProviderRecord; inventory: FlashSystemInventory }

export async function fetchInventory(provider: ProviderRecord, tag?: string): Promise<ProviderInventory> {
  switch (provider.type) {
    case 'VMWARE':
      return {
        source: 'vmware',
        provider,
        inventory: await fetchVmwareInventory(provider.id, tag),
      }
    case 'IBM_POWER':
      return {
        source: 'power',
        provider,
        inventory: await fetchPowerInventory(provider.id),
      }
    case 'FLASHCOPY':
      return {
        source: 'flashsystem',
        provider,
        inventory: await fetchFlashSystemInventory(provider.id),
      }
  }
}
