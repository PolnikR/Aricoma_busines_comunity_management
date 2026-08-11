export const RECOVERY_APP_POLICY_TIME_UNITS = ['minutes', 'hours', 'days'] as const
export type RecoveryAppPolicyTimeUnit = (typeof RECOVERY_APP_POLICY_TIME_UNITS)[number]

export const RECOVERY_APP_POLICY_SELECTION_MODES = [
  'latest',
  'time_range',
  'exact_time',
] as const
export type RecoveryAppPolicySelectionMode =
  (typeof RECOVERY_APP_POLICY_SELECTION_MODES)[number]

export interface RecoveryAppPolicy {
  id: string
  name: string
  description: string
  level: string
  frequencyValue: number
  frequencyUnit: RecoveryAppPolicyTimeUnit
  retentionValue: number
  retentionUnit: RecoveryAppPolicyTimeUnit
  bootVerify: boolean
  snapshotSelectionMode: RecoveryAppPolicySelectionMode
  snapshotMaxAgeValue: number | null
  snapshotMaxAgeUnit: RecoveryAppPolicyTimeUnit | null
  snapshotTargetTime: string | null
  enabled: boolean
}

type RecoveryAppPolicySubmitCommon = Omit<
  RecoveryAppPolicy,
  'snapshotSelectionMode' | 'snapshotMaxAgeValue' | 'snapshotMaxAgeUnit' | 'snapshotTargetTime'
>

export type RecoveryAppPolicySubmitData =
  | (RecoveryAppPolicySubmitCommon & {
    snapshotSelectionMode: 'latest'
  })
  | (RecoveryAppPolicySubmitCommon & {
    snapshotSelectionMode: 'time_range'
    snapshotMaxAgeValue: number
    snapshotMaxAgeUnit: RecoveryAppPolicyTimeUnit
  })
  | (RecoveryAppPolicySubmitCommon & {
    snapshotSelectionMode: 'exact_time'
    snapshotTargetTime: string
  })
