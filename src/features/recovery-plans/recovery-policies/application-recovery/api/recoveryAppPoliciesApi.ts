import { z } from 'zod'
import {
  deleteRecoveryAppPolicyRouteDeleteRecoveryAppPolicyDelete,
  getRecoveryAppPoliciesGetRecoveryAppPoliciesGet,
  submitRecoveryAppPolicySubmitRecoveryAppPolicyPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
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

function requestError(error: unknown, operation: string): Error {
  if (error instanceof OrvalApiError) {
    return new Error(`${operation} request failed with status ${String(error.status)}`, { cause: error })
  }
  return error instanceof Error ? error : new Error(`${operation} request failed`)
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

export function toRecoveryAppPolicySubmitPayload(
  policy: RecoveryAppPolicy | RecoveryAppPolicySubmitData,
): RecoveryAppPolicySubmitWire {
  const policyWithReadFields = policy as RecoveryAppPolicy
  const runtimeSelectionMode: unknown = (
    policy as { snapshotSelectionMode: unknown }
  ).snapshotSelectionMode
  if (
    runtimeSelectionMode !== 'latest'
    && runtimeSelectionMode !== 'time_range'
    && runtimeSelectionMode !== 'exact_time'
  ) {
    recoveryAppPolicySubmitSchema.parse(policy)
  }

  const hasUnexpectedSelectionFields = policy.snapshotSelectionMode === 'latest'
    ? policyWithReadFields.snapshotMaxAgeValue != null
      || policyWithReadFields.snapshotMaxAgeUnit != null
      || policyWithReadFields.snapshotTargetTime != null
    : policy.snapshotSelectionMode === 'time_range'
      ? policyWithReadFields.snapshotTargetTime != null
      : policyWithReadFields.snapshotMaxAgeValue != null
        || policyWithReadFields.snapshotMaxAgeUnit != null

  if (hasUnexpectedSelectionFields) {
    recoveryAppPolicySubmitSchema.parse(policy)
  }

  const submitCommon = {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequencyValue: policy.frequencyValue,
    frequencyUnit: policy.frequencyUnit,
    retentionValue: policy.retentionValue,
    retentionUnit: policy.retentionUnit,
    bootVerify: policy.bootVerify,
    enabled: policy.enabled,
  }
  const submitPolicy = policy.snapshotSelectionMode === 'time_range'
    ? {
        ...submitCommon,
        snapshotSelectionMode: 'time_range' as const,
        snapshotMaxAgeValue: policy.snapshotMaxAgeValue,
        snapshotMaxAgeUnit: policy.snapshotMaxAgeUnit,
      }
    : policy.snapshotSelectionMode === 'exact_time'
      ? {
          ...submitCommon,
          snapshotSelectionMode: 'exact_time' as const,
          snapshotTargetTime: policy.snapshotTargetTime,
        }
      : { ...submitCommon, snapshotSelectionMode: 'latest' as const }
  const validated = recoveryAppPolicySubmitSchema.parse(submitPolicy)
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
  return recoveryAppPoliciesResponseSchema.parse(payload).recovery_app_policies.map(fromWire)
}

export async function fetchRecoveryAppPolicies(): Promise<RecoveryAppPolicy[]> {
  try {
    return parsePolicies(await getRecoveryAppPoliciesGetRecoveryAppPoliciesGet())
  } catch (error) {
    throw requestError(error, 'Get recovery app policies')
  }
}

export async function submitRecoveryAppPolicy(
  policy: RecoveryAppPolicySubmitData,
): Promise<RecoveryAppPolicy[]> {
  try {
    return parsePolicies(await submitRecoveryAppPolicySubmitRecoveryAppPolicyPost(toRecoveryAppPolicySubmitPayload(policy)))
  } catch (error) {
    throw requestError(error, 'Submit recovery app policy')
  }
}

export async function deleteRecoveryAppPolicy(policyId: string): Promise<RecoveryAppPolicy[]> {
  const validatedPolicyId = policyIdSchema.parse(policyId)
  try {
    return parsePolicies(await deleteRecoveryAppPolicyRouteDeleteRecoveryAppPolicyDelete({ policy_id: validatedPolicyId }))
  } catch (error) {
    throw requestError(error, 'Delete recovery app policy')
  }
}
