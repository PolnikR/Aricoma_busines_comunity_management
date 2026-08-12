import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import {
  type ProviderRecord,
  type ProviderRoleFilter,
  type ProviderSubmitData,
} from '../model/providerTypes'
import { providerSubmitSchema, providersResponseSchema } from './schemas/providersSchema'

// List providers -> { providers: [...] }
export async function fetchProviders(role: ProviderRoleFilter = 'all'): Promise<ProviderRecord[]> {
  const params = new URLSearchParams({ role })
  const response = await apiFetch(`${API_ENDPOINTS.providers.list}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Get providers request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}

// Submit a single provider object. The backend upserts
// by id (create when new, update when the id already exists).
export function toProviderSubmitPayload(provider: ProviderSubmitData): ProviderSubmitData {
  return providerSubmitSchema.parse(provider)
}

export async function submitProvider(provider: ProviderSubmitData): Promise<void> {
  const validatedProvider = toProviderSubmitPayload(provider)
  const response = await apiFetch(API_ENDPOINTS.providers.submit, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validatedProvider),
  })

  if (!response.ok) {
    throw new Error(`Submit provider request failed with status ${String(response.status)}`)
  }
}

// Delete by provider_id -> remaining { providers: [...] }
export async function deleteProvider(providerId: string): Promise<ProviderRecord[]> {
  const response = await apiFetch(
    `${API_ENDPOINTS.providers.delete}?provider_id=${encodeURIComponent(providerId)}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    throw new Error(`Delete provider request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}
