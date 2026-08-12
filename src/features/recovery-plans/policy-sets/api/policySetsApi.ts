import { z } from 'zod'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { apiFetch } from '@/shared/api/apiClient'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import {
  policySetsResponseSchema,
  policySetSubmitSchema,
  type PolicySetWire,
} from './schemas/policySetsSchema'

const policySetIdSchema = z.string().min(1)

function requireSuccessfulResponse(response: Response, operation: string): Response {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
  return response
}

function fromWire(policySet: PolicySetWire): PolicySet {
  return {
    id: policySet.id,
    name: policySet.name,
    description: policySet.description,
    snapshotPolicyId: policySet.snapshot_policy_id,
    recoveryAppPolicyId: policySet.recovery_app_policy_id,
  }
}

function toWire(policySet: PolicySetSubmitData): PolicySetWire {
  const validated = policySetSubmitSchema.parse(policySet)
  return {
    id: validated.id,
    name: validated.name,
    description: validated.description,
    snapshot_policy_id: validated.snapshotPolicyId,
    recovery_app_policy_id: validated.recoveryAppPolicyId,
  }
}

async function parsePolicySets(response: Response): Promise<PolicySet[]> {
  const payload: unknown = await response.json()
  return policySetsResponseSchema.parse(payload).policy_sets.map(fromWire)
}

export async function fetchPolicySets(): Promise<PolicySet[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.policySets.list),
    'Get policy sets',
  )
  return parsePolicySets(response)
}

export async function submitPolicySet(
  policySet: PolicySetSubmitData,
): Promise<PolicySet[]> {
  const wirePolicySet = toWire(policySet)
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.policySets.submit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePolicySet),
    }),
    'Submit policy set',
  )
  return parsePolicySets(response)
}

export async function deletePolicySet(policySetId: string): Promise<PolicySet[]> {
  const validatedPolicySetId = policySetIdSchema.parse(policySetId)
  const response = requireSuccessfulResponse(
    await apiFetch(
      `${API_ENDPOINTS.policySets.delete}?policy_set_id=${encodeURIComponent(validatedPolicySetId)}`,
      { method: 'DELETE' },
    ),
    'Delete policy set',
  )
  return parsePolicySets(response)
}
