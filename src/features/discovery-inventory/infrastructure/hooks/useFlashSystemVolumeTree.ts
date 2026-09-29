import { useMemo } from 'react'
import { useGetVolumeTree } from '@/generated/query/storage-volumes/storage-volumes.gen'
import type { FlashSystemVolumeTreeView } from '../model/flashSystemVolumeTreeTypes'
import { createVolumeTreeSelect } from '../model/selectVolumeTree'

export function useFlashSystemVolumeTree(providerId: string | undefined, view: FlashSystemVolumeTreeView | undefined) {
  const select = useMemo(() => createVolumeTreeSelect(view ?? 'flat'), [view])
  return useGetVolumeTree(
    { provider_id: providerId ?? '', view: view ?? 'flat' },
    { query: { select, enabled: Boolean(providerId) && Boolean(view) } },
  )
}
