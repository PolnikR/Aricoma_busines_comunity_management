import { apiFetch } from '@/shared/api/apiClient'
import { tagsResponseSchema } from './schemas/tagsSchema'
import { mapTags } from '../helpers/mapTags'

export async function fetchTags(): Promise<string[]> {
  const response = await apiFetch('/api/tags')

  if (!response.ok) {
    throw new Error(`Tags request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = tagsResponseSchema.parse(payload)
  return mapTags(parsed)
}
