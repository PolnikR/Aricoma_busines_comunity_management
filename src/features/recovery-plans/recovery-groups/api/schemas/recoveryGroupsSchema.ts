import { z } from 'zod'
import type { RecoveryGroupVmMetadata } from '../../model/recoveryGroupTypes'

const rollbackAirflowSchema = z.looseObject({
  status: z.string(),
  dag_id: z.string().optional(),
  paused: z.string().optional(),
  failed_runs: z.array(z.unknown()).optional(),
  dag_file: z.string().optional(),
  dag_record: z.string().optional(),
})

const rollbackIbmSchema = z.looseObject({
  status: z.string(),
  consistency_groups: z.array(z.unknown()).optional(),
  fcmaps: z.array(z.unknown()).optional(),
  volumes: z.array(z.unknown()).optional(),
  errors: z.array(z.unknown()).optional(),
})

export const rollbackReportSchema = z.looseObject({
  status: z.string(),
  airflow: rollbackAirflowSchema.optional(),
  ibm: rollbackIbmSchema.optional(),
})

export type RollbackReport = z.infer<typeof rollbackReportSchema>

export interface RecoveryGroupSubmitPayload {
  id: string
  name: string
  description: string
  provider_id_vm: string
  provider_id_volume: string
  policy_set_id: string
  vms: ({ name: string } & RecoveryGroupVmMetadata)[]
  volumes: { name: string }[]
}
