import type { VolumeTreeResponse, VolumeTreeResponseOutput } from '@/generated/query/zod'
import type {
  FlashSystemTreeNode,
  FlashSystemVolumeTreeCounts,
  FlashSystemVolumeTreeView,
} from './flashSystemVolumeTreeTypes'
import { parseVolumeTreeNodes } from '../helpers/parseVolumeTreeNodes'

export interface FlashSystemVolumeTree {
  counts: FlashSystemVolumeTreeCounts
  nodes: FlashSystemTreeNode[]
}

// Builds the select for one tree view; callers memoize it per view.
export function createVolumeTreeSelect(view: FlashSystemVolumeTreeView) {
  const select = (response: VolumeTreeResponseOutput): FlashSystemVolumeTree => ({
    counts: response.counts,
    nodes: parseVolumeTreeNodes(response.views[view] ?? []),
  })
  // validatingMutator hands select the parsed Output shape; the generated hook
  // declares the Input shape.
  return select as (response: VolumeTreeResponse) => FlashSystemVolumeTree
}
