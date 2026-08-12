import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { apiFetch } from '@/shared/api/apiClient'
import type {
  PlatformProviderRecord,
  PlatformProviderSubmitData,
  PlatformProviderWriteRecord,
} from '../model/platformProviderTypes'
import {
  platformProvidersResponseSchema,
  platformProviderSubmitSchema,
  platformProviderWriteResponseSchema,
} from './schemas/platformProvidersSchema'

function requireSuccessfulResponse(response: Response, operation: string): Response {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
  return response
}

export async function fetchPlatformProviders(): Promise<PlatformProviderRecord[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.platformProviders.list),
    'Get platform providers',
  )
  const payload: unknown = await response.json()
  return platformProvidersResponseSchema.parse(payload).providers
}

export function toPlatformProviderSubmitPayload(
  provider: PlatformProviderSubmitData,
): PlatformProviderSubmitData {
  return platformProviderSubmitSchema.parse(provider)
}

export async function submitPlatformProvider(
  provider: PlatformProviderSubmitData,
): Promise<PlatformProviderWriteRecord[]> {
  const validatedProvider = toPlatformProviderSubmitPayload(provider)
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.platformProviders.submit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatedProvider),
    }),
    'Submit platform provider',
  )
  const payload: unknown = await response.json()
  return platformProviderWriteResponseSchema.parse(payload).providers
}

export async function deletePlatformProvider(
  providerId: string,
): Promise<PlatformProviderWriteRecord[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(
      `${API_ENDPOINTS.platformProviders.delete}?provider_id=${encodeURIComponent(providerId)}`,
      { method: 'DELETE' },
    ),
    'Delete platform provider',
  )
  const payload: unknown = await response.json()
  return platformProviderWriteResponseSchema.parse(payload).providers
}
