import { useMemo, useState } from 'react'
import { TierCard } from './TierCard'
import { AddTierCard } from './AddTierCard'
import type { DraftRecoveryTier } from '../model/recoveryApplicationTypes'
import { calculateTierReorder } from '../utils/calculateTierReorder'

interface TierCanvasProps {
  tiers: Record<string, DraftRecoveryTier>
  recoveryGroupVmOptions?: Readonly<Record<string, readonly string[]>>
  onRecoveryGroupAdded?: (tierId: string, groupId: string) => void
  onRecoveryGroupRemoved?: (tierId: string) => void
  onRecoveryVmSelectionChange?: (tierId: string, vmName: string, selected: boolean) => void
  onTierEdit?: (tierId: string, newTierId: string, updates: {
    tierDescription: string
  }) => void
  onTierAdd?: (tierId: string, tier: DraftRecoveryTier) => void
  onTierDelete?: (tierId: string) => void
  onTierReorder?: (reorderedTiers: Record<string, DraftRecoveryTier>) => void
}

export function TierCanvas({
  tiers,
  recoveryGroupVmOptions,
  onRecoveryGroupAdded,
  onRecoveryGroupRemoved,
  onRecoveryVmSelectionChange,
  onTierEdit,
  onTierAdd,
  onTierDelete,
  onTierReorder,
}: TierCanvasProps) {
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const sortedTiers = useMemo(() => {
    return Object.entries(tiers)
      .map(([id, tier]) => ({ id, tier }))
      .sort((a, b) => a.tier.order - b.tier.order)
  }, [tiers])

  const maxOrder = useMemo(() => {
    return Math.max(0, ...sortedTiers.map(t => t.tier.order))
  }, [sortedTiers])

  const existingIds = useMemo(() => Object.keys(tiers), [tiers])

  const handleEditToggle = (tierId: string) => {
    setEditingTierId(editingTierId === tierId ? null : tierId)
  }

  const handleSave = (tierId: string, newTierId: string, updates: {
    tierDescription: string
  }) => {
    onTierEdit?.(tierId, newTierId, updates)
    setEditingTierId(null)
  }

  const handleCancel = () => {
    setEditingTierId(null)
  }

  const handleDragStart = (event: React.DragEvent, id: string) => {
    const target = event.target
    if (
      target instanceof HTMLElement
      && target.closest('input, textarea, select, button')
    ) {
      event.preventDefault()
      return
    }

    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const newTiers = calculateTierReorder(tiers, sortedTiers, draggedId, targetId)
    onTierReorder?.(newTiers)
    setDraggedId(null)
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))] gap-4">
      {sortedTiers.map(({ id, tier }) => {
        const tierCardProps: React.ComponentProps<typeof TierCard> = {
          id,
          tier,
          isEditing: editingTierId === id,
          onEditToggle: handleEditToggle,
          onSave: handleSave,
          onCancel: handleCancel,
          existingIds,
          canDelete: Object.keys(tiers).length > 1,
        }

        if (onTierDelete) {
          tierCardProps.onDelete = onTierDelete
        }
        if (onRecoveryGroupAdded) {
          tierCardProps.onRecoveryGroupAdded = (groupId) => {
            onRecoveryGroupAdded(id, groupId)
          }
        }
        if (onRecoveryGroupRemoved) {
          tierCardProps.onRecoveryGroupRemoved = () => {
            onRecoveryGroupRemoved(id)
          }
        }
        const recoveryGroupName = tier.recovery_group?.name
        const recoveryGroupVms = recoveryGroupName
          ? recoveryGroupVmOptions?.[recoveryGroupName]
          : undefined
        if (recoveryGroupVms) {
          tierCardProps.recoveryGroupVms = recoveryGroupVms
        }
        if (onRecoveryVmSelectionChange) {
          tierCardProps.onRecoveryVmSelectionChange = (vmName, selected) => {
            onRecoveryVmSelectionChange(id, vmName, selected)
          }
        }

        return (
          <div
            key={id}
            draggable={editingTierId !== id}
            onDragStart={(event) => {
              handleDragStart(event, id)
            }}
            onDragOver={handleDragOver}
            onDrop={() => {
              handleDrop(id)
            }}
            className={`${editingTierId === id ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} h-full opacity-100 transition ${
              draggedId === id ? 'opacity-50' : ''
            }`}
          >
            <TierCard {...tierCardProps} />
          </div>
        )
      })}

      {onTierAdd && <AddTierCard maxOrder={maxOrder} existingIds={existingIds} onAdd={onTierAdd} />}
      {!onTierAdd && <AddTierCard maxOrder={maxOrder} existingIds={existingIds} />}
    </div>
  )
}
