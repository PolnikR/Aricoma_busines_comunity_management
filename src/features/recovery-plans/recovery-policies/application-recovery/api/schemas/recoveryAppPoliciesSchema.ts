import { z } from 'zod'
import {
  RECOVERY_APP_POLICY_SELECTION_MODES,
  RECOVERY_APP_POLICY_TIME_UNITS,
} from '../../model/recoveryAppPolicyTypes'

const positiveInteger = z.number().int().positive()

export const recoveryAppPolicyWireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  level: z.string().min(1),
  frequency_value: positiveInteger,
  frequency_unit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  retention_value: positiveInteger,
  retention_unit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  boot_verify: z.boolean(),
  snapshot_selection_mode: z.enum(RECOVERY_APP_POLICY_SELECTION_MODES),
  snapshot_max_age_value: positiveInteger.nullable(),
  snapshot_max_age_unit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS).nullable(),
  snapshot_target_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  enabled: z.boolean(),
})

export const recoveryAppPolicySubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  level: z.string().min(1),
  frequencyValue: positiveInteger,
  frequencyUnit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  retentionValue: positiveInteger,
  retentionUnit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  bootVerify: z.boolean(),
  snapshotSelectionMode: z.enum(RECOVERY_APP_POLICY_SELECTION_MODES),
  snapshotMaxAgeValue: positiveInteger.nullable(),
  snapshotMaxAgeUnit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS).nullable(),
  snapshotTargetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  enabled: z.boolean(),
})

export const recoveryAppPoliciesResponseSchema = z.object({
  recovery_app_policies: z.array(recoveryAppPolicyWireSchema),
})

export type RecoveryAppPolicyWire = z.infer<typeof recoveryAppPolicyWireSchema>
