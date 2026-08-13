import { z } from 'zod'
import {
  deleteCleanRoomPolicyRouteDeleteCleanRoomPolicyDelete,
  getCleanRoomPoliciesGetCleanRoomPoliciesGet,
  submitCleanRoomPolicySubmitCleanRoomPolicyPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { CleanRoomPolicy, CleanRoomPolicySubmitData } from '../model/cleanRoomPolicyTypes'
import {
  cleanRoomPoliciesResponseSchema,
  cleanRoomPolicySchema,
} from './schemas/cleanRoomPoliciesSchema'

const policyIdSchema = z.string().min(1)

function requestError(error: unknown, operation: string): Error {
  if (error instanceof OrvalApiError) {
    return new Error(`${operation} request failed with status ${String(error.status)}`, { cause: error })
  }
  return error instanceof Error ? error : new Error(`${operation} request failed`)
}

function parsePolicies(payload: unknown): CleanRoomPolicy[] {
  return cleanRoomPoliciesResponseSchema.parse(payload).clean_room_policies
}

export async function fetchCleanRoomPolicies(): Promise<CleanRoomPolicy[]> {
  try {
    return parsePolicies(await getCleanRoomPoliciesGetCleanRoomPoliciesGet())
  } catch (error) {
    throw requestError(error, 'Get clean room policies')
  }
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
  try {
    return parsePolicies(await submitCleanRoomPolicySubmitCleanRoomPolicyPost(validated))
  } catch (error) {
    throw requestError(error, 'Submit clean room policy')
  }
}

export async function deleteCleanRoomPolicy(policyId: string): Promise<CleanRoomPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  try {
    return parsePolicies(await deleteCleanRoomPolicyRouteDeleteCleanRoomPolicyDelete({ policy_id: validatedPolicyId }))
  } catch (error) {
    throw requestError(error, 'Delete clean room policy')
  }
}
