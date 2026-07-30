import { apiFetch } from '@/shared/api/apiClient'
import {
  type ProviderRecord,
  type ProviderSubmitData,
} from '../model/providerTypes'
import { providersResponseSchema } from './schemas/providersSchema'

const GET_PROVIDERS_URL = '/api/get_providers'
const SUBMIT_PROVIDER_URL = '/api/submit_provider'
const DELETE_PROVIDER_URL = '/api/delete_provider'

// GET /api/get_providers -> { providers: [...] }
export async function fetchProviders(): Promise<ProviderRecord[]> {
  const response = await apiFetch(GET_PROVIDERS_URL)

  if (!response.ok) {
    throw new Error(`Get providers request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}

// POST /api/submit_provider with a single provider object. The backend upserts
// by id (create when new, update when the id already exists).
export async function submitProvider(provider: ProviderSubmitData): Promise<void> {
  const response = await apiFetch(SUBMIT_PROVIDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
  })

  if (!response.ok) {
    throw new Error(`Submit provider request failed with status ${String(response.status)}`)
  }
}

// DELETE /api/delete_provider?provider_id=<id> -> remaining { providers: [...] }
export async function deleteProvider(providerId: string): Promise<ProviderRecord[]> {
  const response = await apiFetch(`${DELETE_PROVIDER_URL}?provider_id=${encodeURIComponent(providerId)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Delete provider request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}
