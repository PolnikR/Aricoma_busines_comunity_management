import { z } from 'zod'

export const recoveryGroupResourceSchema = z.object({
  name: z.string().trim().min(1),
})

export const recoveryGroupApiSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string(),
  provider_id_vm: z.string(),
  provider_id_volume: z.string(),
  policy_set_id: z.string().trim().min(1),
  vms: z.array(recoveryGroupResourceSchema),
  volumes: z.array(recoveryGroupResourceSchema),
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
  vms: { name: string }[]
  volumes: { name: string }[]
}
