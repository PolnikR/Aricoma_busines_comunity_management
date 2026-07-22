import { useMemo } from 'react'
import { TierCard } from './TierCard'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCanvasProps {
  tiers: Record<string, RecoveryTier>
  onVMAdded?: (tierId: string, vmName: string) => void
  onVMRemoved?: (tierId: string, vmName: string) => void
}

export function TierCanvas({ tiers, onVMAdded, onVMRemoved }: TierCanvasProps) {
  const sortedTiers = useMemo(() => {
    return Object.entries(tiers)
      .map(([id, tier]) => ({ id, tier }))
      .sort((a, b) => a.tier.order - b.tier.order)
  }, [tiers])

  return (
    <div className="flex-1 grid grid-cols-4 gap-4 overflow-x-auto overflow-y-hidden pr-2">
      {sortedTiers.map(({ id, tier }) => (
        <TierCard
          key={id}
          tier={tier}
          onVMAdded={vmName => onVMAdded?.(id, vmName)}
          onVMRemoved={vmName => onVMRemoved?.(id, vmName)}
        />
      ))}
    </div>
  )
}
