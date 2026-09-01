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
  PlatformProviderCoreRecord,
  PlatformProviderCredentialStatus,
  PlatformProviderRecord,
  PlatformProviderSubmitData,
  PlatformProviderWriteRecord,
} from '../model/platformProviderTypes'
import {
  isPlatformProviderType,
  PLATFORM_PROVIDER_CREDENTIAL_STATUSES,
} from '../model/platformProviderTypes'
import {
  platformProviderRecordSchema,
  platformProviderSubmitSchema,
} from './schemas/platformProvidersSchema'

function isCredentialStatus(value: string): value is PlatformProviderCredentialStatus {
  return PLATFORM_PROVIDER_CREDENTIAL_STATUSES.some(status => status === value)
}

function mapPlatformProviderCore(
  provider: OrchestrationProviderRecordOutput,
): PlatformProviderCoreRecord {
  if (!isPlatformProviderType(provider.type)) {
    throw new Error(`Unsupported platform provider type: ${provider.type}`)
  }

  const common = {
    id: provider.id,
    name: provider.name,
    description: provider.description ?? '',
    role: provider.role,
    ...(provider.url != null ? { url: provider.url } : {}),
  }

  switch (provider.type) {
    case 'AIRFLOW':
      return {
        ...common,
        type: provider.type,
        ipAddress: provider.ipAddress ?? '',
        port: provider.port,
        dagDir: provider.dagDir ?? '',
        credentialId: provider.credentialId ?? '',
        notificationEmail: provider.notificationEmail ?? null,
      }
    case 'SMTP':
      return {
        ...common,
        type: provider.type,
        ipAddress: provider.ipAddress ?? '',
        port: provider.port,
        fromEmail: provider.fromEmail ?? null,
        disableSsl: provider.disableSsl ?? null,
        disableTls: provider.disableTls ?? null,
      }
    case 'BACKEND':
      return {
        ...common,
        type: provider.type,
        notificationEmail: provider.notificationEmail ?? null,
        loggingEnabled: provider.loggingEnabled ?? null,
        jwtEnabled: provider.jwtEnabled ?? null,
        swaggerEnables: provider.swaggerEnables ?? null,
      }
    case 'KEYCLOAK':
      return {
        ...common,
        type: provider.type,
        realm: provider.realm ?? '',
        clientId: provider.clientId ?? '',
        credentialId: provider.credentialId ?? '',
      }
  }
}

function resolveCredentialStatus(
  value: string | null | undefined,
  requireCredentialStatus: boolean,
): PlatformProviderCredentialStatus | undefined {
  if (value == null) return requireCredentialStatus ? 'none' : undefined
  if (isCredentialStatus(value)) return value
  throw new Error(`Unsupported platform provider credential status: ${value}`)
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
  const parsed = platformProviderRecordSchema.parse(provider)
  const core = mapPlatformProviderCore(parsed)
  const credentialStatus = resolveCredentialStatus(parsed.credentialStatus, requireCredentialStatus)

  if (requireCredentialStatus) {
    return {
      ...core,
      credentialStatus: credentialStatus ?? 'none',
      rawRecord: parsed,
    }
  }

  return {
    ...core,
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
