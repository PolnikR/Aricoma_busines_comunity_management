import { useGetVolumes } from '@/generated/query/storage-volumes/storage-volumes.gen'
import { flashSystemInventoryQuery } from '@/features/discovery-inventory/resources/model/inventoryQueries'
import type { VolumesResponse } from '@/generated/query/zod'

const selectPools = (response: VolumesResponse) => Object.values(response.pools ?? {})
  .flatMap(pool => pool.name?.trim() && pool.name !== '-' ? [{ name: pool.name, freeCapacity: pool.free_capacity ?? '-' }] : [])
  .sort((a, b) => a.name.localeCompare(b.name))

export function useRecoveryGroupTargetPools(targetId: string | undefined, enabled: boolean) {
  const active = enabled && Boolean(targetId)
  const query = useGetVolumes(targetId ? { provider_id: targetId } : undefined, {
    query: { ...flashSystemInventoryQuery(targetId), select: selectPools, enabled: active },
  })
  // Disabled observers can still expose cached data, including the default-array key.
  return {
    data: active ? query.data : undefined,
    error: active ? query.error : null,
    isLoading: active && query.isLoading,
    isFetching: active && query.isFetching,
    isError: active && query.isError,
    isSuccess: active && query.isSuccess,
    refetch: () => active ? query.refetch() : Promise.resolve(query),
  }
}
