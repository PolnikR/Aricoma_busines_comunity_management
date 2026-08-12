import { z } from 'zod'

export const recoveryVmSchema = z.object({
  name: z.string(),
  order: z.number().optional(),
  hostname: z.string().optional(),
  ip_address: z.string().optional(),
  os: z.string().optional(),
  cpu: z.number().optional(),
  memory_gb: z.number().optional(),
  storage_gb: z.number().optional(),
})

export const recoveryTierSchema = z.object({
  order: z.number(),
  description: z.string(),
  vms: z.array(recoveryVmSchema).optional(),
  recovery_group: z.object({
    name: z.string(),
    description: z.string(),
    vms: z.array(recoveryVmSchema),
    volumes: z.array(z.object({ name: z.string() })).optional(),
  }).optional(),
})

export const recoveryApplicationRecordSchema = z.object({
  id: z.string(),
  policy_set_id: z.string(),
  application: z.object({
    name: z.string(),
    description: z.string().optional(),
    environment: z.string(),
    platform: z.string(),
    source_connection: z.string().optional(),
    target_connection: z.string().optional(),
    tiers: z.record(z.string(), recoveryTierSchema),
  }),
  airflow_run_id: z.string().nullable().optional(),
  push_to_orchestrator: z.boolean(),
})

export const recoveryApplicationListResponseSchema = z.object({
  applications: z.array(recoveryApplicationRecordSchema),
})

export const submitDagResponseSchema = z.object({
  recovery_applications: z.array(recoveryApplicationRecordSchema),
  orchestrator_push: z.object({
    status: z.string(),
    dag: z.string(),
    json: z.string(),
    dag_id: z.string(),
  }).optional(),
})

export type RecoveryApplicationListPayload = z.infer<typeof recoveryApplicationListResponseSchema>
export type RecoveryTierPayload = z.infer<typeof recoveryTierSchema>
export type RecoveryApplicationRecordPayload = z.infer<typeof recoveryApplicationRecordSchema>
