import { z } from 'zod'
import { SNAPSHOT_POLICY_TIME_UNITS } from '../../model/snapshotPolicyTypes'

const positiveInteger = z.number().int().positive()

export const snapshotPolicySubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  level: z.string().min(1),
  frequencyValue: positiveInteger,
  frequencyUnit: z.enum(SNAPSHOT_POLICY_TIME_UNITS),
  retentionValue: positiveInteger,
  retentionUnit: z.enum(SNAPSHOT_POLICY_TIME_UNITS),
  maxSnapshots: positiveInteger.nullable(),
  enabled: z.boolean(),
})

export const snapshotPolicyWireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  level: z.string().min(1),
  frequency_value: positiveInteger,
  frequency_unit: z.enum(SNAPSHOT_POLICY_TIME_UNITS),
  retention_value: positiveInteger,
  retention_unit: z.enum(SNAPSHOT_POLICY_TIME_UNITS),
  max_snapshots: positiveInteger.nullable(),
  enabled: z.boolean(),
})

export type SnapshotPolicyWire = z.infer<typeof snapshotPolicyWireSchema>
