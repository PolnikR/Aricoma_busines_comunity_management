import { getVolumeTreeRouteGetVolumeTreeGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
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
  try {
    const payload = await getVolumeTreeRouteGetVolumeTreeGet({ provider_id: providerId, view })
    const parsed = flashSystemVolumeTreeResponseSchema.parse(payload)
    return { counts: parsed.counts, nodes: parsed.views[view] ?? [] }
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`FlashSystem volume tree request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
