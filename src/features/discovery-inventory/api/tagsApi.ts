import { z } from 'zod'

const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const tagsResponseSchema = z.object({
  count: z.number(),
  tags: z.array(tagSchema),
})

export async function fetchTags(): Promise<string[]> {
  const response = await fetch('/api/tags', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Tags request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = tagsResponseSchema.parse(payload)

  return parsed.tags.map((tag) => tag.name)
}
