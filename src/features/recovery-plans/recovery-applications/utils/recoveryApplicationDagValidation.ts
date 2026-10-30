import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { findDuplicateRecoveryApplicationWorkloads } from './recoveryApplicationWorkloads'

interface TemplateCatalog {
  templates: readonly { platform: string; version: string; default: boolean }[]
  verified: boolean
}

export interface RecoveryApplicationDagProblem {
  kind: 'duplicateWorkloadWithinTier' | 'duplicateWorkloadAcrossTiers' | 'workloadTaskGroupCollision' | 'tierTaskGroupCollision'
  params: Record<string, string>
}

// Mirrors sanitize_key in the Power v2/v3 and VMware v2 BE DAG templates.
// Unicode mode replaces one code point, matching Python's re.sub.
const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9_-]/gu, '_')

export function findRecoveryApplicationDagProblem(
  draft: Pick<RecoveryApplicationFormState, 'tiers' | 'dagTemplateVersion'>,
  platform: string | undefined,
  catalog?: TemplateCatalog,
): RecoveryApplicationDagProblem | null {
  const normalizedPlatform = platform?.toLowerCase()
  const defaults = catalog?.verified
    ? catalog.templates.filter(template => template.default && template.platform.toLowerCase() === normalizedPlatform)
    : []
  const version = draft.dagTemplateVersion ?? (defaults.length === 1 ? defaults[0]?.version : undefined)
  const power = normalizedPlatform === 'ibm_power'
  if (!(power && (version === 'v2' || version === 'v3') || normalizedPlatform === 'vmware' && version === 'v2')) return null

  const duplicates = findDuplicateRecoveryApplicationWorkloads(draft.tiers)
  // BE refuses exact cross-tier repetitions before checking group IDs.
  const duplicate = duplicates.find(entry => entry.tierIds.length > 1) ?? duplicates[0]
  if (duplicate) return duplicate.tierIds.length > 1
    ? { kind: 'duplicateWorkloadAcrossTiers', params: { name: duplicate.name, tiers: duplicate.tierIds.join(', ') } }
    : { kind: 'duplicateWorkloadWithinTier', params: { name: duplicate.name, tier: duplicate.tierIds[0] ?? '' } }

  const tierIds = new Map<string, string>()
  for (const [tierName, tier] of [...draft.tiers].sort((a, b) => a[1].order - b[1].order)) {
    const workloads = tier.recovery_group?.vms ?? []
    if (workloads.length === 0) continue
    const id = `tier_${String(tier.order).padStart(2, '0')}_${sanitize(tierName)}`
    const previousTier = tierIds.get(id)
    if (previousTier !== undefined) return { kind: 'tierTaskGroupCollision', params: { first: previousTier, second: tierName, id } }
    tierIds.set(id, tierName)
    const workloadIds = new Map<string, string>()
    for (const { name } of workloads) {
      const workloadId = `${power ? 'lpar' : 'vm'}_${sanitize(name)}`
      const previousName = workloadIds.get(workloadId)
      if (previousName !== undefined) return { kind: 'workloadTaskGroupCollision', params: { tier: tierName, first: previousName, second: name, id: workloadId } }
      workloadIds.set(workloadId, name)
    }
  }
  return null
}
