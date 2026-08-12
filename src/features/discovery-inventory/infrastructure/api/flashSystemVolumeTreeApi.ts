import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type {
  FlashSystemTreeNode,
  FlashSystemVolumeTreeCounts,
  FlashSystemVolumeTreeView,
} from '../model/flashSystemVolumeTreeTypes'
import { flashSystemVolumeTreeResponseSchema } from './schemas/flashSystemVolumeTreeSchema'

export interface FlashSystemVolumeTree {
  counts: FlashSystemVolumeTreeCounts
  nodes: FlashSystemTreeNode[]
}

export async function fetchFlashSystemVolumeTree(
  providerId: string,
  view: FlashSystemVolumeTreeView,
): Promise<FlashSystemVolumeTree> {
  const params = new URLSearchParams({ provider_id: providerId, view })
  const response = await apiFetch(`${API_ENDPOINTS.discovery.flashSystemVolumeTree}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`FlashSystem volume tree request failed with status ${String(response.status)}`)
  }
  const payload: unknown = await response.json()
  const parsed = flashSystemVolumeTreeResponseSchema.parse(payload)
  return { counts: parsed.counts, nodes: parsed.views[view] ?? [] }
}
