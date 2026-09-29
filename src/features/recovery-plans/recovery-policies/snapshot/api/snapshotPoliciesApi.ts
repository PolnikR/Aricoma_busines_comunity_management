import { z } from 'zod'
import {
  deletePolicyDeletePolicyDelete,
  getPoliciesGetPoliciesGet,
  submitPolicySubmitPolicyPost,
} from '@/generated/api/client.gen'
import type { SnapshotPolicy as SnapshotPolicyWire } from '@/generated/api/models/snapshotPolicy.gen'
import {
  SnapshotPoliciesResponse,
  SubmitPolicySubmitPolicyPostBody,
  type SnapshotPolicyRecordOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type {
  SnapshotPolicy,
  SnapshotPolicySubmitData,
} from '../model/snapshotPolicyTypes'

const policyIdSchema = z.string().min(1)

function fromWire(policy: SnapshotPolicyRecordOutput): SnapshotPolicy {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? '',
    level: policy.level ?? '',
    frequencyValue: policy.frequency_value,
    frequencyUnit: policy.frequency_unit,
    retentionValue: policy.retention_value,
    retentionUnit: policy.retention_unit,
    maxSnapshots: policy.max_snapshots ?? null,
    enabled: policy.enabled,
  }
}

export function toSnapshotPolicySubmitPayload(
  policy: SnapshotPolicySubmitData,
): SnapshotPolicyWire {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequency_value: policy.frequencyValue,
    frequency_unit: policy.frequencyUnit,
    retention_value: policy.retentionValue,
    retention_unit: policy.retentionUnit,
    max_snapshots: policy.maxSnapshots,
    enabled: policy.enabled,
  }
}

function parsePolicies(payload: unknown): SnapshotPolicy[] {
  return parseGeneratedResponse(
    SnapshotPoliciesResponse,
    payload,
    'Snapshot policies response',
  ).snapshot_policies.map(fromWire)
}

export async function fetchSnapshotPolicies(): Promise<SnapshotPolicy[]> {
  try {
    return parsePolicies(await getPoliciesGetPoliciesGet())
  } catch (error) {
    throw toOrvalRequestError(error, 'Get snapshot policies')
  }
}

export async function submitSnapshotPolicy(
  policy: SnapshotPolicySubmitData,
): Promise<SnapshotPolicy[]> {
  const wirePolicy = SubmitPolicySubmitPolicyPostBody.parse(toSnapshotPolicySubmitPayload(policy))
  try {
    return parsePolicies(await submitPolicySubmitPolicyPost(wirePolicy))
  } catch (error) {
    throw toOrvalRequestError(error, 'Submit snapshot policy')
  }
}

export async function deleteSnapshotPolicy(policyId: string): Promise<SnapshotPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  try {
    return parsePolicies(await deletePolicyDeletePolicyDelete({ policy_id: validatedPolicyId }))
  } catch (error) {
    throw toOrvalRequestError(error, 'Delete snapshot policy')
  }
}
