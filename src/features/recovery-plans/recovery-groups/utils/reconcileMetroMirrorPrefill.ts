import type { MetroMirrorRelationshipsResponseOutput } from '@/generated/query/zod/metroMirrorRelationshipsResponse.gen'

// Overrides contain only user-entered or persisted values; absence permits prefill.
export function reconcileMetroMirrorPrefill(
  names: string[],
  overrides: Record<string, string>,
  consistencyOverride: string | undefined,
  data: MetroMirrorRelationshipsResponseOutput | undefined,
) {
  const auxiliaryNamesByVolume: Record<string, string> = {}
  const unresolvedVolumes: string[] = []
  let hasMismatch = data !== undefined && consistencyOverride !== undefined
    && consistencyOverride.trim() !== (data.consistency_group_id?.trim() ?? '')
  for (const name of names) {
    const matches = data?.volumes.filter(volume => volume.name === name) ?? []
    const match = matches.length === 1 ? matches[0] : undefined
    const automatic = match?.status === 'ok' ? match.auxiliary_name?.trim() : undefined
    const overridden = Object.hasOwn(overrides, name)
    if (overridden) auxiliaryNamesByVolume[name] = overrides[name] ?? ''
    else if (automatic) auxiliaryNamesByVolume[name] = automatic
    if (data && !automatic) unresolvedVolumes.push(name)
    if (data && overridden && (overrides[name]?.trim() ?? '') !== (automatic ?? '')) hasMismatch = true
  }
  return {
    consistencyGroupId: consistencyOverride ?? data?.consistency_group_id?.trim() ?? '',
    auxiliaryNamesByVolume,
    hasMismatch,
    unresolvedVolumes,
  }
}
