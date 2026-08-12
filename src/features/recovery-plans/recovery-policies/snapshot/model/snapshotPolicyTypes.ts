export const SNAPSHOT_POLICY_TIME_UNITS = ['minutes', 'hours', 'days'] as const

export type SnapshotPolicyTimeUnit = (typeof SNAPSHOT_POLICY_TIME_UNITS)[number]

interface SnapshotPolicyFields {
  id: string
  name: string
  description: string
  level: string
  frequencyValue: number
  frequencyUnit: SnapshotPolicyTimeUnit
  retentionValue: number
  retentionUnit: SnapshotPolicyTimeUnit
  maxSnapshots: number | null
  enabled: boolean
}

export type SnapshotPolicy = SnapshotPolicyFields

// Kept as a separate public contract even though the backend currently accepts
// every field returned by reads. This allows read and write shapes to evolve independently.
export type SnapshotPolicySubmitData = SnapshotPolicyFields
