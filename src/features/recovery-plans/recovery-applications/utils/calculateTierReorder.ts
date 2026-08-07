import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface SortedTier {
  id: string
  tier: RecoveryTier
}

export function calculateTierReorder(
  tiers: Record<string, RecoveryTier>,
  sortedTiers: SortedTier[],
  draggedId: string,
  targetId: string,
): Record<string, RecoveryTier> {
  const draggedIndex = sortedTiers.findIndex(t => t.id === draggedId)
  const targetIndex = sortedTiers.findIndex(t => t.id === targetId)

  if (draggedIndex === -1 || targetIndex === -1) {
    return tiers
  }

  // Calculate where each tier ends up in the sort order
  const newOrder = sortedTiers.map((_t, i) => {
    if (i === targetIndex) return draggedIndex < targetIndex ? i : i + 1
    if (i === draggedIndex) return targetIndex < draggedIndex ? targetIndex : targetIndex - 1
    if (draggedIndex < targetIndex && i > draggedIndex && i <= targetIndex) return i - 1
    if (draggedIndex > targetIndex && i >= targetIndex && i < draggedIndex) return i + 1
    return i
  })

  // Apply the new order values to the tier objects
  const newTiers = { ...tiers }
  sortedTiers.forEach((t, i) => {
    const orderValue = newOrder[i] ?? i
    const oldTier = newTiers[t.id]
    if (oldTier) {
      newTiers[t.id] = { ...oldTier, order: orderValue + 1 }
    }
  })

  return newTiers
}
