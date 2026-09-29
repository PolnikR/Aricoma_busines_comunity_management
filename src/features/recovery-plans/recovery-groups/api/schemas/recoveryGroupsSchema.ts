import { z } from 'zod'
import type { RecoveryGroup as GeneratedRecoveryGroup } from '@/generated/api/models/recoveryGroup.gen'
import { RollbackReport as GeneratedRollbackReport } from '@/generated/api/zod.gen'
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

// SPEC GAP: the generated RollbackReport pins down only `status`; the airflow and
// ibm sections the UI reports on are typed locally.
export const rollbackReportSchema = GeneratedRollbackReport.extend({
  airflow: rollbackAirflowSchema.optional(),
  ibm: rollbackIbmSchema.optional(),
}).loose()

export type RollbackReport = z.infer<typeof rollbackReportSchema>

// SPEC GAP: the generated RecoveryVM declares only `name`, but the backend also
// accepts per-VM metadata (order, hostname, ...). The payload is therefore not
// parsed with the generated body schema, which would strip that metadata.
export type RecoveryGroupSubmitPayload = Omit<GeneratedRecoveryGroup, 'vms'> & {
  vms: ({ name: string } & RecoveryGroupVmMetadata)[]
}
