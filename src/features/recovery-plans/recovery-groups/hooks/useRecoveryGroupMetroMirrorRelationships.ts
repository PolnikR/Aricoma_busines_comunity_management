import { useGetMetroMirrorRelationships } from '@/generated/query/storage-volumes/storage-volumes.gen'
import type { MetroMirrorRelationshipsResponseOutput } from '@/generated/query/zod/metroMirrorRelationshipsResponse.gen'

export function useRecoveryGroupMetroMirrorRelationships(sourceId: string | null, names: string[], enabled: boolean) {
  const active = enabled && Boolean(sourceId) && names.length > 0
  const query = useGetMetroMirrorRelationships(
    { provider_id: sourceId ?? '', volume_names: [...new Set(names)].sort() },
    { query: {
      enabled: active,
      placeholderData: () => undefined,
      select: (data: MetroMirrorRelationshipsResponseOutput) => {
        if (data.provider_id !== sourceId) throw new Error('Relationship provider does not match the selected Source')
        return data
      },
    } },
  )
  return {
    data: active && !query.error ? query.data : undefined,
    error: active ? query.error : null,
    isLoading: active && query.isFetching,
    refetch: query.refetch,
  }
}
