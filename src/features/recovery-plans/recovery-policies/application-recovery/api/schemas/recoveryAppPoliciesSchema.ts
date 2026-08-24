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

const recoveryAppPolicySubmitCommonSchema = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  level: z.string().min(1),
  frequencyValue: positiveInteger,
  frequencyUnit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  retentionValue: positiveInteger,
  retentionUnit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  bootVerify: z.boolean(),
  enabled: z.boolean(),
}

const targetTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const recoveryAppPolicySubmitSchema = z.discriminatedUnion('snapshotSelectionMode', [
  z.object({
    ...recoveryAppPolicySubmitCommonSchema,
    snapshotSelectionMode: z.literal('latest'),
  }).strict(),
  z.object({
    ...recoveryAppPolicySubmitCommonSchema,
    snapshotSelectionMode: z.literal('time_range'),
    snapshotMaxAgeValue: positiveInteger,
    snapshotMaxAgeUnit: z.enum(RECOVERY_APP_POLICY_TIME_UNITS),
  }).strict(),
  z.object({
    ...recoveryAppPolicySubmitCommonSchema,
    snapshotSelectionMode: z.literal('exact_time'),
    snapshotTargetTime: targetTime,
  }).strict(),
])

export type RecoveryAppPolicyWire = z.infer<typeof recoveryAppPolicyWireSchema>

type RecoveryAppPolicySubmitWireCommon = Omit<
  RecoveryAppPolicyWire,
  'snapshot_selection_mode' | 'snapshot_max_age_value' | 'snapshot_max_age_unit' | 'snapshot_target_time'
>

export type RecoveryAppPolicySubmitWire =
  | (RecoveryAppPolicySubmitWireCommon & {
    snapshot_selection_mode: 'latest'
  })
  | (RecoveryAppPolicySubmitWireCommon & {
    snapshot_selection_mode: 'time_range'
    snapshot_max_age_value: number
    snapshot_max_age_unit: (typeof RECOVERY_APP_POLICY_TIME_UNITS)[number]
  })
  | (RecoveryAppPolicySubmitWireCommon & {
    snapshot_selection_mode: 'exact_time'
    snapshot_target_time: string
  })
