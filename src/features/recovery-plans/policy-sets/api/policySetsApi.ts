import { z } from 'zod'
import {
  deletePolicySetRouteDeletePolicySetDelete,
  getPolicySetsGetPolicySetsGet,
  submitPolicySetSubmitPolicySetPost,
} from '@/generated/api/client.gen'
import {
  PolicySetsResponse,
  type PolicySetRecordOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import {
  policySetSubmitSchema,
  type PolicySetWire,
} from './schemas/policySetsSchema'

const policySetIdSchema = z.string().min(1)

function fromWire(policySet: PolicySetRecordOutput): PolicySet {
  return policySetSubmitSchema.parse({
    id: policySet.id,
    name: policySet.name,
    description: policySet.description ?? '',
    snapshotPolicyId: policySet.snapshot_policy_id ?? '',
    recoveryAppPolicyId: policySet.recovery_app_policy_id ?? '',
    cleanRoomPolicyId: policySet.clean_room_policy_id ?? '',
  })
}

export function toPolicySetSubmitPayload(policySet: PolicySetSubmitData): PolicySetWire {
  const validated = policySetSubmitSchema.parse(policySet)
  return {
    id: validated.id,
    name: validated.name,
    description: validated.description,
    snapshot_policy_id: validated.snapshotPolicyId,
    recovery_app_policy_id: validated.recoveryAppPolicyId,
    clean_room_policy_id: validated.cleanRoomPolicyId,
  }
}

function parsePolicySets(payload: unknown): PolicySet[] {
  return parseGeneratedResponse(
    PolicySetsResponse,
    payload,
    'Policy sets response',
  ).policy_sets.map(fromWire)
}

export async function fetchPolicySets(): Promise<PolicySet[]> {
  try {
    return parsePolicySets(await getPolicySetsGetPolicySetsGet())
  } catch (error) {
    throw toOrvalRequestError(error, 'Get policy sets')
  }
}

export async function submitPolicySet(
  policySet: PolicySetSubmitData,
): Promise<PolicySet[]> {
  const wirePolicySet = toPolicySetSubmitPayload(policySet)
  try {
    return parsePolicySets(await submitPolicySetSubmitPolicySetPost(wirePolicySet))
  } catch (error) {
    throw toOrvalRequestError(error, 'Submit policy set')
  }
}

export async function deletePolicySet(policySetId: string): Promise<PolicySet[]> {
  const validatedPolicySetId = policySetIdSchema.parse(policySetId)
  try {
    return parsePolicySets(await deletePolicySetRouteDeletePolicySetDelete({ policy_set_id: validatedPolicySetId }))
  } catch (error) {
    throw toOrvalRequestError(error, 'Delete policy set')
  }
}
