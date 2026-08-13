import {
  deleteProviderRouteDeleteProviderDelete,
  getProvidersGetProvidersGet,
  submitProviderSubmitProviderPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import {
  type ProviderRecord,
  type ProviderRoleFilter,
  type ProviderSubmitData,
} from '../model/providerTypes'
import { providerSubmitSchema, providersResponseSchema } from './schemas/providersSchema'

// List providers -> { providers: [...] }
export async function fetchProviders(role: ProviderRoleFilter = 'all'): Promise<ProviderRecord[]> {
  try {
    const payload = await getProvidersGetProvidersGet({ role })
    return providersResponseSchema.parse(payload).providers
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
    return providersResponseSchema.parse(payload).providers
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Delete provider request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
