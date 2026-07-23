import { useState } from 'react'
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
          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">ID</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none ${
                !isValidId && id ? 'border-red-500' : 'border-[#cfdaea]'
              }`}
              placeholder="tier_id"
            />
            {!isValidId && id && (
              <p className="text-xs text-red-600 mt-1">ID already in use or invalid</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none"
              placeholder="Tier name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="flex-1 px-3 py-1.5 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7bc4] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-1.5 bg-[#f0f5fa] text-[#18253d] text-sm font-semibold rounded-md hover:bg-[#e3edf6] transition border border-[#d9e6f1]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="bg-white border-2 border-dashed border-[#cfdaea] rounded-lg p-4 shadow-sm hover:border-[#b9d5e8] hover:bg-[#fbfdff] transition flex items-center justify-center h-full"
    >
      <span className="text-3xl text-[#7b8ca4]">+</span>
    </button>
  )
}
