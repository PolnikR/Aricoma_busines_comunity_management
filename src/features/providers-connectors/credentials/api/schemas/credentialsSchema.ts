import { z } from 'zod'

export const apiErrorResponseSchema = z.object({
  detail: z.string(),
})
