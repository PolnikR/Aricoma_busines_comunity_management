import { z } from 'zod'

const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const tagsResponseSchema = z.object({
  count: z.number(),
  tags: z.array(tagSchema),
})

export type TagsPayload = z.infer<typeof tagsResponseSchema>
