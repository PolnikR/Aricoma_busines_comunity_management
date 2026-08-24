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
  platformProviderRecordSchema,
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
  if (provider.credentialStatus != null && !isCredentialStatus(provider.credentialStatus)) {
    throw new Error(`Unsupported platform provider credential status: ${provider.credentialStatus}`)
  }

  const parsed = platformProviderRecordSchema.parse(provider)
  const { credentialStatus: parsedCredentialStatus, url: parsedUrl, ...parsedProvider } = parsed
  let credentialStatus: PlatformProviderCredentialStatus | undefined
  if (parsedCredentialStatus == null) credentialStatus = requireCredentialStatus ? 'none' : undefined
  else if (isCredentialStatus(parsedCredentialStatus)) credentialStatus = parsedCredentialStatus
  else throw new Error(`Unsupported platform provider credential status: ${parsedCredentialStatus}`)
  const validated = {
    ...parsedProvider,
    description: parsedProvider.description ?? '',
    ipAddress: parsedProvider.ipAddress ?? '',
    port: parsedProvider.port,
    dagDir: parsedProvider.dagDir ?? '',
    credentialId: parsedProvider.credentialId ?? '',
    ...(parsedUrl != null ? { url: parsedUrl } : {}),
  }
  return {
    ...validated,
    ...(credentialStatus !== undefined ? { credentialStatus } : {}),
    ...(requireCredentialStatus ? { rawRecord: parsed } : {}),
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
  platformProviderSubmitSchema.parse(provider)
  return provider
}

export async function submitPlatformProvider(
  provider: PlatformProviderSubmitData,
): Promise<PlatformProviderWriteRecord[]> {
  const validatedProvider = toPlatformProviderSubmitPayload(provider)
  const generatedProvider = validatedProvider
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
