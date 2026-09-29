import type { TagsResponseOutput } from '@/generated/query/zod'

export function mapTags(payload: TagsResponseOutput): string[] {
  return [...new Set(payload.tags.map((tag) => tag.name))]
}
