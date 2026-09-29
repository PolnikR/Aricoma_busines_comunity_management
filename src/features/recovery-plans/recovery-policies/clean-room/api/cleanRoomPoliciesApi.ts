import { z } from 'zod'
import {
  deleteCleanRoomPolicyRouteDeleteCleanRoomPolicyDelete,
  getCleanRoomPoliciesGetCleanRoomPoliciesGet,
  submitCleanRoomPolicySubmitCleanRoomPolicyPost,
} from '@/generated/api/client.gen'
import type { CleanRoomPolicy as CleanRoomPolicyWire } from '@/generated/api/models/cleanRoomPolicy.gen'
import {
  CleanRoomPoliciesResponse,
  SubmitCleanRoomPolicySubmitCleanRoomPolicyPostBody,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type { CleanRoomPolicy, CleanRoomPolicySubmitData } from '../model/cleanRoomPolicyTypes'

const policyIdSchema = z.string().min(1)

function parsePolicies(payload: unknown): CleanRoomPolicy[] {
  return parseGeneratedResponse(
    CleanRoomPoliciesResponse,
    payload,
    'Clean room policies response',
  ).clean_room_policies.map(policy => ({
    id: policy.id,
    name: policy.name,
    description: policy.description ?? '',
    enabled: policy.enabled,
  }))
}

export async function fetchCleanRoomPolicies(): Promise<CleanRoomPolicy[]> {
  try {
    return parsePolicies(await getCleanRoomPoliciesGetCleanRoomPoliciesGet())
  } catch (error) {
    throw toOrvalRequestError(error, 'Get clean room policies')
  }
}

export function toCleanRoomPolicySubmitPayload(
  policy: CleanRoomPolicySubmitData,
): CleanRoomPolicyWire {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    enabled: policy.enabled,
  }
}

export async function submitCleanRoomPolicy(
  policy: CleanRoomPolicySubmitData,
): Promise<CleanRoomPolicy[]> {
  const validated = SubmitCleanRoomPolicySubmitCleanRoomPolicyPostBody.parse(toCleanRoomPolicySubmitPayload(policy))
  try {
    return parsePolicies(await submitCleanRoomPolicySubmitCleanRoomPolicyPost(validated))
  } catch (error) {
    throw toOrvalRequestError(error, 'Submit clean room policy')
  }
}

export async function deleteCleanRoomPolicy(policyId: string): Promise<CleanRoomPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  try {
    return parsePolicies(await deleteCleanRoomPolicyRouteDeleteCleanRoomPolicyDelete({ policy_id: validatedPolicyId }))
  } catch (error) {
    throw toOrvalRequestError(error, 'Delete clean room policy')
  }
}
