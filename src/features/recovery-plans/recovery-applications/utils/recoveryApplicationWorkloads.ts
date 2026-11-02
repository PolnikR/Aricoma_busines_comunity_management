import type { DraftRecoveryTier } from '../model/recoveryApplicationTypes'

// Compare exact source names: no trimming, case folding or DAG task-id sanitization.
export function findDuplicateRecoveryApplicationWorkloads(tiers: ReadonlyMap<string, DraftRecoveryTier>): { name: string; tierIds: string[] }[] {
  const occurrences = new Map<string, { count: number; tierIds: Set<string> }>()
  for (const [tierId, tier] of tiers) {
    for (const { name } of tier.recovery_group?.vms ?? []) {
      const entry = occurrences.get(name) ?? { count: 0, tierIds: new Set<string>() }
      entry.count += 1
      entry.tierIds.add(tierId)
      occurrences.set(name, entry)
    }
  }
  return Array.from(occurrences).flatMap(([name, entry]) => entry.count > 1 ? [{ name, tierIds: [...entry.tierIds] }] : [])
}
