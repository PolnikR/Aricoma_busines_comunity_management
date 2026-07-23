import { useMemo, useState } from 'react'
import { TierCard } from './TierCard'
import { AddTierCard } from './AddTierCard'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCanvasProps {
  tiers: Record<string, RecoveryTier>
  onVMAdded?: (tierId: string, vmName: string) => void
  onVMRemoved?: (tierId: string, vmName: string) => void
  onTierEdit?: (tierId: string, newTierId: string, updates: { name: string; description: string }) => void
  onTierAdd?: (tierId: string, tier: RecoveryTier) => void
  onTierDelete?: (tierId: string) => void
  onTierReorder?: (reorderedTiers: Record<string, RecoveryTier>) => void
}

export function TierCanvas({
  tiers,
  onVMAdded,
  onVMRemoved,
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

  const handleSave = (tierId: string, newTierId: string, updates: { name: string; description: string }) => {
    onTierEdit?.(tierId, newTierId, updates)
    setEditingTierId(null)
  }

  const handleCancel = () => {
    setEditingTierId(null)
  }

  const handleDragStart = (id: string) => {
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

    const draggedIndex = sortedTiers.findIndex(t => t.id === draggedId)
    const targetIndex = sortedTiers.findIndex(t => t.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    const newTiers = { ...tiers }
    const newOrder = sortedTiers.map((_t, i) => {
      if (i === targetIndex) return draggedIndex < targetIndex ? i : i + 1
      if (i === draggedIndex) return targetIndex < draggedIndex ? targetIndex : targetIndex - 1
      if (draggedIndex < targetIndex && i > draggedIndex && i <= targetIndex) return i - 1
      if (draggedIndex > targetIndex && i >= targetIndex && i < draggedIndex) return i + 1
      return i
    })

    sortedTiers.forEach((t, i) => {
      const orderValue = newOrder[i] ?? i
      const oldTier = newTiers[t.id]
      if (oldTier) {
        newTiers[t.id] = { ...oldTier, order: orderValue + 1 }
      }
    })

    onTierReorder?.(newTiers)
    setDraggedId(null)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        if (onVMAdded) {
          tierCardProps.onVMAdded = (vmName) => {
            onVMAdded(id, vmName)
          }
        }
        if (onVMRemoved) {
          tierCardProps.onVMRemoved = (vmName) => {
            onVMRemoved(id, vmName)
          }
        }

        return (
          <div
            key={id}
            draggable
            onDragStart={() => {
              handleDragStart(id)
            }}
            onDragOver={handleDragOver}
            onDrop={() => {
              handleDrop(id)
            }}
            className={`cursor-grab active:cursor-grabbing opacity-100 transition ${
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
