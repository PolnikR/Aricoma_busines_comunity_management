import { z } from 'zod'
import {
  deletePolicySetRouteDeletePolicySetDelete,
  getPolicySetsGetPolicySetsGet,
  submitPolicySetSubmitPolicySetPost,
} from '@/generated/api/client.gen'
import type { PolicySet as PolicySetWire } from '@/generated/api/models/policySet.gen'
import {
  PolicySetsResponse,
  SubmitPolicySetSubmitPolicySetPostBody,
  type PolicySetRecordOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'

const policySetIdSchema = z.string().min(1)

function fromWire(policySet: PolicySetRecordOutput): PolicySet {
  return {
    id: policySet.id,
    name: policySet.name,
    description: policySet.description ?? '',
    snapshotPolicyId: policySet.snapshot_policy_id ?? '',
    recoveryAppPolicyId: policySet.recovery_app_policy_id ?? '',
    cleanRoomPolicyId: policySet.clean_room_policy_id ?? '',
  }
}

export function toPolicySetSubmitPayload(policySet: PolicySetSubmitData): PolicySetWire {
  return {
    id: policySet.id,
    name: policySet.name,
    description: policySet.description,
    snapshot_policy_id: policySet.snapshotPolicyId,
    recovery_app_policy_id: policySet.recoveryAppPolicyId,
    clean_room_policy_id: policySet.cleanRoomPolicyId,
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
  const wirePolicySet = SubmitPolicySetSubmitPolicySetPostBody.parse(toPolicySetSubmitPayload(policySet))
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
