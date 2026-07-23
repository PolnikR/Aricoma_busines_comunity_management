import { z } from 'zod'

const GET_PROVIDERS_URL = '/api/get_providers'
const SUBMIT_PROVIDER_URL = '/api/submit_provider'
const DELETE_PROVIDER_URL = '/api/delete_provider'

export interface ProviderRecord {
  id: string
  name: string
  description: string
  type: string
  ipAddress: string
}

const providerRecordSchema = z.object({
  id: z.string().catch(''),
  name: z.string().catch(''),
  description: z.string().catch(''),
  type: z.string().catch(''),
  ipAddress: z.string().catch(''),
})

const providersResponseSchema = z.object({
  providers: z.array(providerRecordSchema),
})

// GET /api/get_providers -> { providers: [...] }
export async function fetchProviders(): Promise<ProviderRecord[]> {
  const response = await fetch(GET_PROVIDERS_URL, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Get providers request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}

// POST /api/submit_provider with the full { providers: [...] } set;
// returns the updated set.
export async function submitProviders(providers: ProviderRecord[]): Promise<ProviderRecord[]> {
  const response = await fetch(SUBMIT_PROVIDER_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ providers }),
  })

  if (!response.ok) {
    throw new Error(`Submit provider request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}

// DELETE /api/delete_provider?provider_id=<id> -> remaining { providers: [...] }
export async function deleteProvider(providerId: string): Promise<ProviderRecord[]> {
  const response = await fetch(`${DELETE_PROVIDER_URL}?provider_id=${encodeURIComponent(providerId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Delete provider request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  return providersResponseSchema.parse(payload).providers
}
