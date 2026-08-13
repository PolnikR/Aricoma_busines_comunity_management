import {
  deletePlatformProviderDeletePlatformProviderDelete,
  getPlatformProvidersGetPlatformProvidersGet,
  submitPlatformProviderSubmitPlatformProviderPost,
} from '@/generated/api/client.gen'
import {
  PlatformProvidersResponse,
  type OrchestrationProviderRecordOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type {
  PlatformProviderCredentialStatus,
  PlatformProviderRecord,
  PlatformProviderSubmitData,
  PlatformProviderWriteRecord,
} from '../model/platformProviderTypes'
import { PLATFORM_PROVIDER_CREDENTIAL_STATUSES } from '../model/platformProviderTypes'
import {
  platformProviderSubmitSchema,
} from './schemas/platformProvidersSchema'

function isCredentialStatus(value: string): value is PlatformProviderCredentialStatus {
  return PLATFORM_PROVIDER_CREDENTIAL_STATUSES.some(status => status === value)
}

function mapPlatformProvider(
  provider: OrchestrationProviderRecordOutput,
  requireCredentialStatus: true,
): PlatformProviderRecord
function mapPlatformProvider(
  provider: OrchestrationProviderRecordOutput,
  requireCredentialStatus: false,
): PlatformProviderWriteRecord
function mapPlatformProvider(
  provider: OrchestrationProviderRecordOutput,
  requireCredentialStatus: boolean,
): PlatformProviderRecord | PlatformProviderWriteRecord {
  if (provider.type !== 'AIRFLOW') {
    throw new Error(`Unsupported platform provider type: ${provider.type}`)
  }
  if (provider.credentialStatus != null && !isCredentialStatus(provider.credentialStatus)) {
    throw new Error(`Unsupported platform provider credential status: ${provider.credentialStatus}`)
  }

  const validated = platformProviderSubmitSchema.parse({
    id: provider.id,
    name: provider.name,
    description: provider.description ?? '',
    type: provider.type,
    ipAddress: provider.ipAddress ?? '',
    port: provider.port,
    dagDir: provider.dagDir,
    credentialId: provider.credentialId ?? '',
    ...(provider.url != null ? { url: provider.url } : {}),
  })
  const credentialStatus = provider.credentialStatus ?? (requireCredentialStatus ? 'none' : undefined)
  return {
    ...validated,
    ...(credentialStatus !== undefined ? { credentialStatus } : {}),
  }
}

function parsePlatformProviders(
  payload: unknown,
  operation: string,
): OrchestrationProviderRecordOutput[] {
  return parseGeneratedResponse(PlatformProvidersResponse, payload, operation).providers
}

export async function fetchPlatformProviders(): Promise<PlatformProviderRecord[]> {
  try {
    const payload = await getPlatformProvidersGetPlatformProvidersGet()
    return parsePlatformProviders(payload, 'GET /get_platform_providers')
      .map(provider => mapPlatformProvider(provider, true))
  } catch (error) {
    throw toOrvalRequestError(error, 'Get platform providers')
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
    return parsePlatformProviders(payload, 'POST /submit_platform_provider')
      .map(item => mapPlatformProvider(item, false))
  } catch (error) {
    throw toOrvalRequestError(error, 'Submit platform provider')
  }
}

export async function deletePlatformProvider(
  providerId: string,
): Promise<PlatformProviderWriteRecord[]> {
  try {
    const payload = await deletePlatformProviderDeletePlatformProviderDelete({ provider_id: providerId })
    return parsePlatformProviders(payload, 'DELETE /delete_platform_provider')
      .map(item => mapPlatformProvider(item, false))
  } catch (error) {
    throw toOrvalRequestError(error, 'Delete platform provider')
  }
}
