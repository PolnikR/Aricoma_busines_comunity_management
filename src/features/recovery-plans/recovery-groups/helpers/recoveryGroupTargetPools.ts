import type { VolumesResponse } from '@/generated/query/zod'

export function missingAutomaticPools(source: VolumesResponse | undefined, volumeNames: readonly string[], targetPools: readonly { name: string }[] | undefined): string[] {
  if (!source || !targetPools) return []
  const names = new Set(targetPools.map(pool => pool.name))
  const missing = volumeNames.flatMap(name => {
    const volume = source.volumes.find(item => item.name === name)
    if (!volume) return []
    const pool = volume.mdisk_grp_name && volume.mdisk_grp_name !== '-'
      ? volume.mdisk_grp_name : source.pools?.[volume.mdisk_grp_id ?? '']?.name
    return pool && pool !== '-' && !names.has(pool) ? [pool] : []
  })
  return [...new Set(missing)]
}
