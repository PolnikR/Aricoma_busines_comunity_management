import { z } from 'zod'
import {
  deletePolicyDeletePolicyDelete,
  getPoliciesGetPoliciesGet,
  submitPolicySubmitPolicyPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type {
  SnapshotPolicy,
  SnapshotPolicySubmitData,
} from '../model/snapshotPolicyTypes'
import {
  snapshotPoliciesResponseSchema,
  snapshotPolicySubmitSchema,
  type SnapshotPolicyWire,
} from './schemas/snapshotPoliciesSchema'

const policyIdSchema = z.string().min(1)

function requestError(error: unknown, operation: string): Error {
  if (error instanceof OrvalApiError) {
    return new Error(`${operation} request failed with status ${String(error.status)}`, { cause: error })
  }
  return error instanceof Error ? error : new Error(`${operation} request failed`)
}

function fromWire(policy: SnapshotPolicyWire): SnapshotPolicy {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequencyValue: policy.frequency_value,
    frequencyUnit: policy.frequency_unit,
    retentionValue: policy.retention_value,
    retentionUnit: policy.retention_unit,
    maxSnapshots: policy.max_snapshots,
    enabled: policy.enabled,
  }
}

export function toSnapshotPolicySubmitPayload(
  policy: SnapshotPolicySubmitData,
): SnapshotPolicyWire {
  const validated = snapshotPolicySubmitSchema.parse(policy)
  return {
    id: validated.id,
    name: validated.name,
    description: validated.description,
    level: validated.level,
    frequency_value: validated.frequencyValue,
    frequency_unit: validated.frequencyUnit,
    retention_value: validated.retentionValue,
    retention_unit: validated.retentionUnit,
    max_snapshots: validated.maxSnapshots,
    enabled: validated.enabled,
  }
}

function parsePolicies(payload: unknown): SnapshotPolicy[] {
  return snapshotPoliciesResponseSchema.parse(payload).snapshot_policies.map(fromWire)
}

export async function fetchSnapshotPolicies(): Promise<SnapshotPolicy[]> {
  try {
    return parsePolicies(await getPoliciesGetPoliciesGet())
  } catch (error) {
    throw requestError(error, 'Get snapshot policies')
  }
}

export async function submitSnapshotPolicy(
  policy: SnapshotPolicySubmitData,
): Promise<SnapshotPolicy[]> {
  const wirePolicy = toSnapshotPolicySubmitPayload(policy)
  try {
    return parsePolicies(await submitPolicySubmitPolicyPost(wirePolicy))
  } catch (error) {
    throw requestError(error, 'Submit snapshot policy')
  }
}

export async function deleteSnapshotPolicy(policyId: string): Promise<SnapshotPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  try {
    return parsePolicies(await deletePolicyDeletePolicyDelete({ policy_id: validatedPolicyId }))
  } catch (error) {
    throw requestError(error, 'Delete snapshot policy')
  }
}
