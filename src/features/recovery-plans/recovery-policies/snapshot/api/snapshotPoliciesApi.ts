import { z } from 'zod'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { apiFetch } from '@/shared/api/apiClient'
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

function requireSuccessfulResponse(response: Response, operation: string): Response {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
  return response
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

async function parsePolicies(response: Response): Promise<SnapshotPolicy[]> {
  const payload: unknown = await response.json()
  return snapshotPoliciesResponseSchema.parse(payload).snapshot_policies.map(fromWire)
}

export async function fetchSnapshotPolicies(): Promise<SnapshotPolicy[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.snapshotPolicies.list),
    'Get snapshot policies',
  )
  return parsePolicies(response)
}

export async function submitSnapshotPolicy(
  policy: SnapshotPolicySubmitData,
): Promise<SnapshotPolicy[]> {
  const wirePolicy = toSnapshotPolicySubmitPayload(policy)
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.snapshotPolicies.submit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePolicy),
    }),
    'Submit snapshot policy',
  )
  return parsePolicies(response)
}

export async function deleteSnapshotPolicy(policyId: string): Promise<SnapshotPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  const response = requireSuccessfulResponse(
    await apiFetch(
      `${API_ENDPOINTS.snapshotPolicies.delete}?policy_id=${encodeURIComponent(validatedPolicyId)}`,
      { method: 'DELETE' },
    ),
    'Delete snapshot policy',
  )
  return parsePolicies(response)
}
