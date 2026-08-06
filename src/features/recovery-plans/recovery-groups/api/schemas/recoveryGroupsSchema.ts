import { z } from 'zod'
import type { RecoveryGroupVmMetadata } from '../../model/recoveryGroupTypes'

export const recoveryGroupResourceSchema = z.object({
  name: z.string().trim().min(1),
})

export const recoveryGroupVmResourceSchema = z.object({
  name: z.string().trim().min(1),
  order: z.number().optional(),
  hostname: z.string().optional(),
  ip_address: z.string().optional(),
  os: z.string().optional(),
  cpu: z.number().optional(),
  memory_gb: z.number().optional(),
  storage_gb: z.number().optional(),
})

export const recoveryGroupApiSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string(),
  provider_id_vm: z.string(),
  provider_id_volume: z.string(),
  policy_set_id: z.string().trim().min(1),
  vms: z.array(recoveryGroupVmResourceSchema),
  volumes: z.array(recoveryGroupResourceSchema),
  airflow_run_id: z.string().nullable().optional(),
  push_to_orchestrator: z.boolean().optional(),
})

export const recoveryGroupsResponseSchema = z.object({
  recovery_groups: z.array(recoveryGroupApiSchema),
})

export type RecoveryGroupApiRecord = z.infer<typeof recoveryGroupApiSchema>
export type RecoveryGroupsResponse = z.infer<typeof recoveryGroupsResponseSchema>

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
