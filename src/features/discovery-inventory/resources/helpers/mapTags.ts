import type { TagsPayload } from '../api/schemas/tagsSchema'

export function mapTags(payload: TagsPayload): string[] {
  return payload.tags.map((tag) => tag.name)
}
