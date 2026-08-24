import { z } from 'zod'

export const policySetSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  snapshotPolicyId: z.string().min(1),
  recoveryAppPolicyId: z.string().min(1),
  cleanRoomPolicyId: z.string().min(1),
})

export const policySetWireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  snapshot_policy_id: z.string().min(1),
  recovery_app_policy_id: z.string().min(1),
  clean_room_policy_id: z.string().min(1),
})

export type PolicySetWire = z.infer<typeof policySetWireSchema>
