import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import {
  type ProviderRecord,
  type ProviderSubmitData,
} from '../model/providerTypes'
import { providersResponseSchema } from './schemas/providersSchema'

// List providers -> { providers: [...] }
export async function fetchProviders(): Promise<ProviderRecord[]> {
  const response = await apiFetch(API_ENDPOINTS.providers.list)

  if (!response.ok) {
    throw new Error(`Get providers request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}

// Submit a single provider object. The backend upserts
// by id (create when new, update when the id already exists).
export async function submitProvider(provider: ProviderSubmitData): Promise<void> {
  const response = await apiFetch(API_ENDPOINTS.providers.submit, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
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
