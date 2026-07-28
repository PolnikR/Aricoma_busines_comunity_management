import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { slugify } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface AddTierCardProps {
  onAdd?: (id: string, tier: RecoveryTier) => void
  maxOrder: number
  existingIds: string[]
}

export function AddTierCard({ onAdd, maxOrder, existingIds }: AddTierCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recoveryGroupName, setRecoveryGroupName] = useState('')
  const [id, setId] = useState('')
  const [tierDescription, setTierDescription] = useState('')
  const [recoveryGroupDescription, setRecoveryGroupDescription] = useState('')

  const handleRecoveryGroupNameChange = (value: string) => {
    setRecoveryGroupName(value)
    if (!id || id === slugify(recoveryGroupName)) {
      setId(slugify(value))
    }
  }

  const isValidId = Boolean(id.trim()) && !existingIds.includes(id)
  const canCreate = Boolean(
    isValidId
    && tierDescription.trim()
    && recoveryGroupName.trim()
    && recoveryGroupDescription.trim()
  )

  const handleCreate = () => {
    if (!canCreate) return

    const newTier: RecoveryTier = {
      description: tierDescription.trim(),
      order: maxOrder + 1,
      recovery_group: {
        name: recoveryGroupName.trim(),
        description: recoveryGroupDescription.trim(),
        vms: [],
      },
    }

    onAdd?.(id.trim(), newTier)
    setIsOpen(false)
    setRecoveryGroupName('')
    setId('')
    setTierDescription('')
    setRecoveryGroupDescription('')
  }

  const handleCancel = () => {
    setIsOpen(false)
    setRecoveryGroupName('')
    setId('')
    setTierDescription('')
    setRecoveryGroupDescription('')
  }

  if (isOpen) {
    return (
      <div className="bg-white border border-[#d9e6f1] rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <Field label="ID" htmlFor="add-tier-id">
            <Input
              id="add-tier-id"
              type="text"
              value={id}
              onChange={e => {
                setId(e.target.value)
              }}
              size="sm"
              invalid={Boolean(!isValidId && id)}
              placeholder="tier_id"
              required
            />
            {!isValidId && id && (
              <p className="text-xs text-red-600 mt-1">ID already in use or invalid</p>
            )}
          </Field>

          <Field label="Tier description *" htmlFor="add-tier-description">
            <Textarea
              id="add-tier-description"
              value={tierDescription}
              onChange={e => {
                setTierDescription(e.target.value)
              }}
              className="resize-none"
              rows={3}
              placeholder="Tier description"
              required
            />
          </Field>

          <Field label="Recovery group name *" htmlFor="add-tier-recovery-group-name">
            <Input
              id="add-tier-recovery-group-name"
              type="text"
              value={recoveryGroupName}
              onChange={e => {
                handleRecoveryGroupNameChange(e.target.value)
              }}
              size="sm"
              placeholder="Recovery group name"
              required
            />
          </Field>

          <Field label="Recovery group description *" htmlFor="add-tier-recovery-group-description">
            <Textarea
              id="add-tier-recovery-group-description"
              value={recoveryGroupDescription}
              onChange={e => {
                setRecoveryGroupDescription(e.target.value)
              }}
              className="resize-none"
              rows={3}
              placeholder="Recovery group description"
              required
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              size="sm"
              className="flex-1"
            >
              Create
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setIsOpen(true)
      }}
      className="bg-white border-2 border-dashed border-[#cfdaea] rounded-lg p-4 shadow-sm hover:border-[#b9d5e8] hover:bg-[#fbfdff] transition flex items-center justify-center h-full"
    >
      <span className="text-3xl text-[#7b8ca4]">+</span>
    </button>
  )
}
