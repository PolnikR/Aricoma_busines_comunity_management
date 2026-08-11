import { z } from 'zod'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { apiFetch } from '@/shared/api/apiClient'
import type {
  RecoveryAppPolicy,
  RecoveryAppPolicySubmitData,
} from '../model/recoveryAppPolicyTypes'
import {
  recoveryAppPoliciesResponseSchema,
  recoveryAppPolicySubmitSchema,
  type RecoveryAppPolicySubmitWire,
  type RecoveryAppPolicyWire,
} from './schemas/recoveryAppPoliciesSchema'

const policyIdSchema = z.string().min(1)

function requireSuccessfulResponse(response: Response, operation: string): Response {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
  return response
}

function fromWire(policy: RecoveryAppPolicyWire): RecoveryAppPolicy {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequencyValue: policy.frequency_value,
    frequencyUnit: policy.frequency_unit,
    retentionValue: policy.retention_value,
    retentionUnit: policy.retention_unit,
    bootVerify: policy.boot_verify,
    snapshotSelectionMode: policy.snapshot_selection_mode,
    snapshotMaxAgeValue: policy.snapshot_max_age_value,
    snapshotMaxAgeUnit: policy.snapshot_max_age_unit,
    snapshotTargetTime: policy.snapshot_target_time,
    enabled: policy.enabled,
  }
}

function toWire(policy: RecoveryAppPolicySubmitData): RecoveryAppPolicySubmitWire {
  const validated = recoveryAppPolicySubmitSchema.parse(policy)
  const common = {
    id: validated.id,
    name: validated.name,
    description: validated.description,
    level: validated.level,
    frequency_value: validated.frequencyValue,
    frequency_unit: validated.frequencyUnit,
    retention_value: validated.retentionValue,
    retention_unit: validated.retentionUnit,
    boot_verify: validated.bootVerify,
    enabled: validated.enabled,
  }

  switch (validated.snapshotSelectionMode) {
    case 'latest':
      return { ...common, snapshot_selection_mode: 'latest' }
    case 'time_range':
      return {
        ...common,
        snapshot_selection_mode: 'time_range',
        snapshot_max_age_value: validated.snapshotMaxAgeValue,
        snapshot_max_age_unit: validated.snapshotMaxAgeUnit,
      }
    case 'exact_time':
      return {
        ...common,
        snapshot_selection_mode: 'exact_time',
        snapshot_target_time: validated.snapshotTargetTime,
      }
  }
}

async function parsePolicies(response: Response): Promise<RecoveryAppPolicy[]> {
  const payload: unknown = await response.json()
  return recoveryAppPoliciesResponseSchema.parse(payload).recovery_app_policies.map(fromWire)
}

export async function fetchRecoveryAppPolicies(): Promise<RecoveryAppPolicy[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.recoveryAppPolicies.list),
    'Get recovery app policies',
  )
  return parsePolicies(response)
}

export async function submitRecoveryAppPolicy(
  policy: RecoveryAppPolicySubmitData,
): Promise<RecoveryAppPolicy[]> {
  const response = requireSuccessfulResponse(
    await apiFetch(API_ENDPOINTS.recoveryAppPolicies.submit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toWire(policy)),
    }),
    'Submit recovery app policy',
  )
  return parsePolicies(response)
}

export async function deleteRecoveryAppPolicy(policyId: string): Promise<RecoveryAppPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  const response = requireSuccessfulResponse(
    await apiFetch(
      `${API_ENDPOINTS.recoveryAppPolicies.delete}?policy_id=${encodeURIComponent(validatedPolicyId)}`,
      { method: 'DELETE' },
    ),
    'Delete recovery app policy',
  )
  return parsePolicies(response)
}
