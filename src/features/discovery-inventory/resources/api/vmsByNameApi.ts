import { vmsByNameVmsByNameGet } from '@/generated/api/client.gen'
import { VmsResponse, type VmsResponseOutput } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { OrvalApiError } from '@/shared/api/orvalMutator'

export interface FetchVmsByNameParams {
  prefix?: string
  providerId?: string
}

export async function fetchVmsByName(params: FetchVmsByNameParams = {}): Promise<VmsResponseOutput> {
  try {
    const payload = await vmsByNameVmsByNameGet({
      ...(params.prefix ? { prefix: params.prefix } : {}),
      ...(params.providerId ? { provider_id: params.providerId } : {}),
    })
    return parseGeneratedResponse(VmsResponse, payload, 'GET /vms_by_name')
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Vms by name request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
