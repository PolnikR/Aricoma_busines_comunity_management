import { z } from 'zod'

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
