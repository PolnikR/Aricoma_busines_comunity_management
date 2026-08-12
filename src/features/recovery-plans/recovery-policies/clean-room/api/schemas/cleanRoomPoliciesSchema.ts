import { z } from 'zod'

export const cleanRoomPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
})

export const cleanRoomPoliciesResponseSchema = z.object({
  clean_room_policies: z.array(cleanRoomPolicySchema),
})

export type CleanRoomPolicyWire = z.infer<typeof cleanRoomPolicySchema>
