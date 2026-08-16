import {
  deleteProviderRouteDeleteProviderDelete,
  getProvidersGetProvidersGet,
  submitProviderSubmitProviderPost,
} from '@/generated/api/client.gen'
import {
  ProvidersResponse,
  type ProviderRecordOutput as GeneratedProviderRecord,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import {
  PROVIDER_CREDENTIAL_STATUSES,
  PROVIDER_TYPES,
  type ProviderRecord,
  type ProviderRoleFilter,
  type ProviderSubmitData,
  type ProviderCredentialStatus,
  type ProviderType,
} from '../model/providerTypes'
import { providerSubmitSchema } from './schemas/providersSchema'

function isProviderType(value: string): value is ProviderType {
  return PROVIDER_TYPES.some(type => type === value)
}

function isCredentialStatus(value: string): value is ProviderCredentialStatus {
  return PROVIDER_CREDENTIAL_STATUSES.some(status => status === value)
}

function mapProviderRecord(provider: GeneratedProviderRecord): ProviderRecord {
  if (!isProviderType(provider.type)) {
    throw new Error(`Unsupported infrastructure provider type: ${provider.type}`)
  }
  if (provider.credentialStatus != null && !isCredentialStatus(provider.credentialStatus)) {
    throw new Error(`Unsupported provider credential status: ${provider.credentialStatus}`)
  }

  const validated = providerSubmitSchema.parse({
    id: provider.id,
    name: provider.name,
    description: provider.description ?? '',
    type: provider.type,
    ipAddress: provider.ipAddress ?? '',
    credentialId: provider.credentialId ?? null,
    role: provider.role,
    ...(provider.url !== undefined ? { url: provider.url } : {}),
    ...(provider.defaultFlashcopyProviderId !== undefined
      ? { defaultFlashcopyProviderId: provider.defaultFlashcopyProviderId }
      : {}),
    ...(provider.orchestratorConnId !== undefined
      ? { orchestratorConnId: provider.orchestratorConnId }
      : {}),
  })
  return {
    ...validated,
    credentialStatus: provider.credentialStatus ?? 'none',
    rawRecord: provider,
  }
}

function parseProviders(payload: unknown, operation: string): ProviderRecord[] {
  return parseGeneratedResponse(ProvidersResponse, payload, operation).providers
    .map(mapProviderRecord)
}

// List providers -> { providers: [...] }
export async function fetchProviders(role: ProviderRoleFilter = 'all'): Promise<ProviderRecord[]> {
  try {
    const payload = await getProvidersGetProvidersGet({ role })
    return parseProviders(payload, 'GET /get_providers')
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Get providers request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}

// Submit a single provider object. The backend upserts
// by id (create when new, update when the id already exists).
export function toProviderSubmitPayload(provider: ProviderSubmitData): ProviderSubmitData {
  return providerSubmitSchema.parse(provider)
}

export async function submitProvider(provider: ProviderSubmitData): Promise<void> {
  const validatedProvider = toProviderSubmitPayload(provider)
  const generatedProvider = {
    id: validatedProvider.id,
    name: validatedProvider.name,
    description: validatedProvider.description,
    type: validatedProvider.type,
    ipAddress: validatedProvider.ipAddress,
    credentialId: validatedProvider.credentialId,
    role: validatedProvider.role,
    ...(validatedProvider.url !== undefined ? { url: validatedProvider.url } : {}),
    ...(validatedProvider.defaultFlashcopyProviderId !== undefined
      ? { defaultFlashcopyProviderId: validatedProvider.defaultFlashcopyProviderId }
      : {}),
    ...(validatedProvider.orchestratorConnId !== undefined
      ? { orchestratorConnId: validatedProvider.orchestratorConnId }
      : {}),
  }
  try {
    await submitProviderSubmitProviderPost(generatedProvider)
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Submit provider request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}

// Delete by provider_id -> remaining { providers: [...] }
export async function deleteProvider(providerId: string): Promise<ProviderRecord[]> {
  try {
    const payload = await deleteProviderRouteDeleteProviderDelete({ provider_id: providerId })
    return parseProviders(payload, 'DELETE /delete_provider')
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Delete provider request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
