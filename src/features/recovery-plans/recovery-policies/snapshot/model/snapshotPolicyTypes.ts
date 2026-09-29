import type { SnapshotPolicyRecordOutput } from '@/generated/query/zod'

export const SNAPSHOT_POLICY_TIME_UNITS = ['minutes', 'hours', 'days'] as const satisfies readonly SnapshotPolicyRecordOutput['frequency_unit'][]

export type SnapshotPolicyTimeUnit = (typeof SNAPSHOT_POLICY_TIME_UNITS)[number]
