import { tagsTagsGet } from '@/generated/api/client.gen'
import { TagsResponse } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { mapTags } from '../helpers/mapTags'

export async function fetchTags(): Promise<string[]> {
  try {
    const payload = await tagsTagsGet()
    return mapTags(parseGeneratedResponse(TagsResponse, payload, 'GET /tags'))
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Tags request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
