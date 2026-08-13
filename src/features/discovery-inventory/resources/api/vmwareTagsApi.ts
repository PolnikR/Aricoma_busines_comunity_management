import { tagsTagsGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { tagsResponseSchema } from './schemas/tagsSchema'
import { mapTags } from '../helpers/mapTags'

export async function fetchTags(): Promise<string[]> {
  try {
    const payload = await tagsTagsGet()
    return mapTags(tagsResponseSchema.parse(payload))
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Tags request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
