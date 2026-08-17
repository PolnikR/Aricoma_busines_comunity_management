import { z } from 'zod'

export const recoveryTierSchema = z.object({
  order: z.number(),
  description: z.string(),
  recovery_group: z.object({
    name: z.string(),
    description: z.string(),
    vms: z.array(z.object({
      name: z.string(),
    })),
  }).optional(),
})

export const recoveryApplicationListResponseSchema = z.object({
  applications: z.array(z.object({
    name: z.string(),
    description: z.string(),
    environment: z.enum(['dev', 'staging', 'prod']),
    platform: z.string(),
    source_connection: z.string(),
    target_connection: z.string(),
    tiers: z.record(z.string(), recoveryTierSchema),
    file: z.string(),
  })),
})

export const submitDagResponseSchema = z.object({
  status: z.string(),
  filename: z.string(),
  local: z.string(),
})

export type RecoveryApplicationListPayload = z.infer<typeof recoveryApplicationListResponseSchema>
export type RecoveryTierPayload = z.infer<typeof recoveryTierSchema>
