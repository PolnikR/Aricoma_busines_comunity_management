import type { TagsResponseOutput } from '@/generated/api/zod.gen'

export function mapTags(payload: TagsResponseOutput): string[] {
  return [...new Set(payload.tags.map((tag) => tag.name))]
}
