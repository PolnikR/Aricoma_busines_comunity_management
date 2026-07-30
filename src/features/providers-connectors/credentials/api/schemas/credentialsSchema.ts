import { z } from 'zod'

const credentialRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  username: z.string(),
})

export const credentialsResponseSchema = z.object({
  credentials: z.array(credentialRecordSchema),
})

export const apiErrorResponseSchema = z.object({
  detail: z.string(),
})
