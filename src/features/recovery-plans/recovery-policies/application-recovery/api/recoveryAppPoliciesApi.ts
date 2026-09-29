import { z } from 'zod'
import {
  deleteRecoveryAppPolicyRouteDeleteRecoveryAppPolicyDelete,
  getRecoveryAppPoliciesGetRecoveryAppPoliciesGet,
  submitRecoveryAppPolicySubmitRecoveryAppPolicyPost,
} from '@/generated/api/client.gen'
import type { RecoveryAppPolicy as RecoveryAppPolicyWire } from '@/generated/api/models/recoveryAppPolicy.gen'
import {
  RecoveryAppPoliciesResponse,
  SubmitRecoveryAppPolicySubmitRecoveryAppPolicyPostBody,
  type RecoveryAppPolicyRecordOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type {
  RecoveryAppPolicy,
  RecoveryAppPolicySubmitData,
} from '../model/recoveryAppPolicyTypes'

const policyIdSchema = z.string().min(1)

function fromWire(policy: RecoveryAppPolicyRecordOutput): RecoveryAppPolicy {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? '',
    level: policy.level ?? '',
    frequencyValue: policy.frequency_value,
    frequencyUnit: policy.frequency_unit,
    retentionValue: policy.retention_value,
    retentionUnit: policy.retention_unit,
    bootVerify: policy.boot_verify,
    snapshotSelectionMode: policy.snapshot_selection_mode,
    snapshotMaxAgeValue: policy.snapshot_max_age_value ?? null,
    snapshotMaxAgeUnit: policy.snapshot_max_age_unit ?? null,
    snapshotTargetTime: policy.snapshot_target_time ?? null,
    enabled: policy.enabled,
  }
}

// Sends only the fields that belong to the selected snapshot mode. Mode-specific
// required fields and the HH:MM target time are validated by the policy form.
export function toRecoveryAppPolicySubmitPayload(
  policy: RecoveryAppPolicySubmitData,
): RecoveryAppPolicyWire {
  const common = {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequency_value: policy.frequencyValue,
    frequency_unit: policy.frequencyUnit,
    retention_value: policy.retentionValue,
    retention_unit: policy.retentionUnit,
    boot_verify: policy.bootVerify,
    snapshot_selection_mode: policy.snapshotSelectionMode,
    enabled: policy.enabled,
  }

  switch (policy.snapshotSelectionMode) {
    case 'time_range':
      return {
        ...common,
        snapshot_max_age_value: policy.snapshotMaxAgeValue,
        snapshot_max_age_unit: policy.snapshotMaxAgeUnit,
      }
    case 'exact_time':
      return { ...common, snapshot_target_time: policy.snapshotTargetTime }
    default:
      return common
  }
}

export function toRecoveryAppPolicyReadPayload(policy: RecoveryAppPolicy): RecoveryAppPolicyWire {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequency_value: policy.frequencyValue,
    frequency_unit: policy.frequencyUnit,
    retention_value: policy.retentionValue,
    retention_unit: policy.retentionUnit,
    boot_verify: policy.bootVerify,
    snapshot_selection_mode: policy.snapshotSelectionMode,
    snapshot_max_age_value: policy.snapshotMaxAgeValue,
    snapshot_max_age_unit: policy.snapshotMaxAgeUnit,
    snapshot_target_time: policy.snapshotTargetTime,
    enabled: policy.enabled,
  }
}

function parsePolicies(payload: unknown): RecoveryAppPolicy[] {
  return parseGeneratedResponse(
    RecoveryAppPoliciesResponse,
    payload,
    'Recovery application policies response',
  ).recovery_app_policies.map(fromWire)
}

export async function fetchRecoveryAppPolicies(): Promise<RecoveryAppPolicy[]> {
  try {
    return parsePolicies(await getRecoveryAppPoliciesGetRecoveryAppPoliciesGet())
  } catch (error) {
    throw toOrvalRequestError(error, 'Get recovery app policies')
  }
}

export async function submitRecoveryAppPolicy(
  policy: RecoveryAppPolicySubmitData,
): Promise<RecoveryAppPolicy[]> {
  try {
    return parsePolicies(await submitRecoveryAppPolicySubmitRecoveryAppPolicyPost(
      SubmitRecoveryAppPolicySubmitRecoveryAppPolicyPostBody.parse(toRecoveryAppPolicySubmitPayload(policy)),
    ))
  } catch (error) {
    throw toOrvalRequestError(error, 'Submit recovery app policy')
  }
}

export async function deleteRecoveryAppPolicy(policyId: string): Promise<RecoveryAppPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  try {
    return parsePolicies(await deleteRecoveryAppPolicyRouteDeleteRecoveryAppPolicyDelete({ policy_id: validatedPolicyId }))
  } catch (error) {
    throw toOrvalRequestError(error, 'Delete recovery app policy')
  }
}
