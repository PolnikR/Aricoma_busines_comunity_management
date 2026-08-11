import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import { tagsResponseSchema } from './schemas/tagsSchema'
import { mapTags } from '../helpers/mapTags'

export async function fetchTags(): Promise<string[]> {
  const response = await apiFetch(API_ENDPOINTS.discovery.tags)

  if (!response.ok) {
    throw new Error(`Tags request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = tagsResponseSchema.parse(payload)
  return mapTags(parsed)
}
