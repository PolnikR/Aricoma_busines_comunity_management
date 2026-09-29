import type { RecoveryAppPolicyRecordOutput } from '@/generated/query/zod'

export const RECOVERY_APP_POLICY_TIME_UNITS = ['minutes', 'hours', 'days'] as const satisfies readonly RecoveryAppPolicyRecordOutput['frequency_unit'][]
export type RecoveryAppPolicyTimeUnit = (typeof RECOVERY_APP_POLICY_TIME_UNITS)[number]

export const RECOVERY_APP_POLICY_SELECTION_MODES = [
  'latest',
  'time_range',
  'exact_time',
] as const satisfies readonly RecoveryAppPolicyRecordOutput['snapshot_selection_mode'][]
export type RecoveryAppPolicySelectionMode =
  (typeof RECOVERY_APP_POLICY_SELECTION_MODES)[number]
