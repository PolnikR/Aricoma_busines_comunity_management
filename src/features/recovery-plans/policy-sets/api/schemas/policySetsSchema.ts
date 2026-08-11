import { z } from 'zod'

export const policySetSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  snapshotPolicyIds: z.array(z.string().min(1)).min(1),
  recoveryAppPolicyId: z.string().min(1),
})

export const policySetWireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  snapshot_policy_ids: z.array(z.string().min(1)).min(1),
  recovery_app_policy_id: z.string().min(1),
})

export const policySetsResponseSchema = z.object({
  policy_sets: z.array(policySetWireSchema),
})

export type PolicySetWire = z.infer<typeof policySetWireSchema>
