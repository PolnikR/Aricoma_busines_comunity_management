import { z } from 'zod'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { apiFetch } from '@/shared/api/apiClient'
import type { CleanRoomPolicy, CleanRoomPolicySubmitData } from '../model/cleanRoomPolicyTypes'
import {
  cleanRoomPoliciesResponseSchema,
  cleanRoomPolicySchema,
} from './schemas/cleanRoomPoliciesSchema'

const policyIdSchema = z.string().min(1)

function requireSuccessfulResponse(response: Response, operation: string): Response {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
  return response
}

async function parsePolicies(response: Response): Promise<CleanRoomPolicy[]> {
  const payload: unknown = await response.json()
  return cleanRoomPoliciesResponseSchema.parse(payload).clean_room_policies
}

export async function fetchCleanRoomPolicies(): Promise<CleanRoomPolicy[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.cleanRoomPolicies.list),
    'Get clean room policies',
  )
  return parsePolicies(response)
}

export function toCleanRoomPolicySubmitPayload(
  policy: CleanRoomPolicySubmitData,
): CleanRoomPolicySubmitData {
  return cleanRoomPolicySchema.parse(policy)
}

export async function submitCleanRoomPolicy(
  policy: CleanRoomPolicySubmitData,
): Promise<CleanRoomPolicy[]> {
  const validated = toCleanRoomPolicySubmitPayload(policy)
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.cleanRoomPolicies.submit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    }),
    'Submit clean room policy',
  )
  return parsePolicies(response)
}

export async function deleteCleanRoomPolicy(policyId: string): Promise<CleanRoomPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  const response = requireSuccessfulResponse(
    await apiFetch(
      `${API_ENDPOINTS.cleanRoomPolicies.delete}?policy_id=${encodeURIComponent(validatedPolicyId)}`,
      { method: 'DELETE' },
    ),
    'Delete clean room policy',
  )
  return parsePolicies(response)
}
