import {
  deletePlatformProviderDeletePlatformProviderDelete,
  getPlatformProvidersGetPlatformProvidersGet,
  submitPlatformProviderSubmitPlatformProviderPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
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

function requestError(error: unknown, operation: string): Error {
  if (error instanceof OrvalApiError) {
    return new Error(`${operation} request failed with status ${String(error.status)}`, { cause: error })
  }
  return error instanceof Error ? error : new Error(`${operation} request failed`)
}

export async function fetchPlatformProviders(): Promise<PlatformProviderRecord[]> {
  try {
    const payload = await getPlatformProvidersGetPlatformProvidersGet()
    return platformProvidersResponseSchema.parse(payload).providers
  } catch (error) {
    throw requestError(error, 'Get platform providers')
  }
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
  const { url, ...providerWithoutUrl } = validatedProvider
  const generatedProvider = url === undefined
    ? providerWithoutUrl
    : { ...providerWithoutUrl, url }
  try {
    const payload = await submitPlatformProviderSubmitPlatformProviderPost(generatedProvider)
    return platformProviderWriteResponseSchema.parse(payload).providers
  } catch (error) {
    throw requestError(error, 'Submit platform provider')
  }
}

export async function deletePlatformProvider(
  providerId: string,
): Promise<PlatformProviderWriteRecord[]> {
  try {
    const payload = await deletePlatformProviderDeletePlatformProviderDelete({ provider_id: providerId })
    return platformProviderWriteResponseSchema.parse(payload).providers
  } catch (error) {
    throw requestError(error, 'Delete platform provider')
  }
}
