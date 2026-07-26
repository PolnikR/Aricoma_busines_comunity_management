import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Field, Input } from '@/shared/components/form/FormControls'
import { slugify } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface AddTierCardProps {
  onAdd?: (id: string, tier: RecoveryTier) => void
  maxOrder: number
  existingIds: string[]
}

export function AddTierCard({ onAdd, maxOrder, existingIds }: AddTierCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [description, setDescription] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    if (!id || id === slugify(name)) {
      setId(slugify(value))
    }
  }

  const isValidId = id.trim() && !existingIds.includes(id)
  const isValidName = name.trim()
  const canCreate = isValidId && isValidName

  const handleCreate = () => {
    if (!canCreate) return

    const newTier: RecoveryTier = {
      name: name.trim(),
      description: description.trim(),
      order: maxOrder + 1,
      vms: [],
    }

    onAdd?.(id.trim(), newTier)
    setIsOpen(false)
    setName('')
    setId('')
    setDescription('')
  }

  const handleCancel = () => {
    setIsOpen(false)
    setName('')
    setId('')
    setDescription('')
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
            />
            {!isValidId && id && (
              <p className="text-xs text-red-600 mt-1">ID already in use or invalid</p>
            )}
          </Field>

          <Field label="Name *" htmlFor="add-tier-name">
            <Input
              id="add-tier-name"
              type="text"
              value={name}
              onChange={e => {
                handleNameChange(e.target.value)
              }}
              size="sm"
              placeholder="Tier name"
            />
          </Field>

          <Field label="Description" htmlFor="add-tier-description">
            <textarea
              id="add-tier-description"
              value={description}
              onChange={e => {
                setDescription(e.target.value)
              }}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none resize-none"
              rows={3}
              placeholder="Optional description"
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
