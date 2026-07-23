import { useState, useEffect } from 'react'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  id: string
  tier: RecoveryTier
  isEditing?: boolean
  onEditToggle?: (id: string) => void
  onSave?: (id: string, newId: string, updates: { name: string; description: string }) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  existingIds: string[]
  canDelete: boolean
  onVMAdded?: (vmName: string) => void
  onVMRemoved?: (vmName: string) => void
}

export function TierCard({
  id,
  tier,
  isEditing = false,
  onEditToggle,
  onSave,
  onDelete,
  onCancel,
  existingIds,
  canDelete,
  onVMAdded,
  onVMRemoved,
}: TierCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [editId, setEditId] = useState(id)
  const [editName, setEditName] = useState(tier.name)
  const [editDescription, setEditDescription] = useState(tier.description)
  const [idError, setIdError] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (isEditing) {
      setEditId(id)
      setEditName(tier.name)
      setEditDescription(tier.description)
      setIdError('')
      setNameError('')
    }
  }, [isEditing, id, tier])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const vmName = e.dataTransfer.getData('vm-name')
    if (vmName) {
      onVMAdded?.(vmName)
    }
  }

  const handleConfirm = () => {
    let hasError = false

    if (!editName.trim()) {
      setNameError('Name is required')
      hasError = true
    } else {
      setNameError('')
    }

    if (!editId.trim()) {
      setIdError('ID is required')
      hasError = true
    } else if (editId !== id && existingIds.includes(editId)) {
      setIdError('ID already in use')
      hasError = true
    } else {
      setIdError('')
    }

    if (!hasError) {
      const newId = editId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
      onSave?.(id, newId, { name: editName.trim(), description: editDescription.trim() })
    }
  }

  if (isEditing) {
    return (
      <div className="bg-white border border-[#d9e6f1] rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">ID</label>
            <input
              type="text"
              value={editId}
              onChange={e => setEditId(e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none ${
                idError ? 'border-red-500' : 'border-[#cfdaea]'
              }`}
              placeholder="tier_id"
            />
            {idError && <p className="text-xs text-red-600 mt-1">{idError}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none ${
                nameError ? 'border-red-500' : 'border-[#cfdaea]'
              }`}
              placeholder="Tier name"
            />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7bc4] transition"
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 bg-[#f0f5fa] text-[#18253d] text-sm font-semibold rounded-md hover:bg-[#e3edf6] transition border border-[#d9e6f1]"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete?.(id)}
              disabled={!canDelete}
              className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-md hover:bg-red-100 transition border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canDelete ? 'Cannot delete the last tier' : 'Delete this tier'}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-dashed border-[#d9e6f1] rounded-lg flex flex-col overflow-hidden min-w-70 shadow-sm">
      <button
        onClick={() => onEditToggle?.(id)}
        className="px-4 py-3 border-b border-[#edf2f7] bg-[#fbfdff] text-left hover:bg-[#f0f5fa] transition"
      >
        <div className="text-xs text-[#7b8ca4] font-semibold uppercase tracking-wider mb-1">
          Order: <span className="font-bold">{tier.order}</span>
        </div>
        <div className="text-sm font-semibold text-[#18253d] mb-1">{tier.name}</div>
        <div className="text-xs text-[#71819a]">{tier.description}</div>
      </button>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-3 min-h-75 flex flex-col gap-2 transition-all ${
          isDragOver ? 'bg-[#e3edf6] border-t border-blue-light-500' : 'bg-[#f8fbfe]'
        }`}
      >
        {tier.vms.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[#91a4bc]">
            Drag VMs here
          </div>
        ) : (
          tier.vms.map(vm => (
            <div
              key={vm.name}
              className="p-2 bg-white border border-[#d9e6f1] rounded-md text-xs text-[#18253d] flex items-center justify-between group hover:border-[#b9d5e8]"
            >
              <span>{vm.name}</span>
              <button
                onClick={() => onVMRemoved?.(vm.name)}
                className="text-[#91a4bc] hover:text-[#d4353d] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove VM"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#edf2f7] bg-[#fbfdff] flex gap-2">
        <button
          onClick={() => onEditToggle?.(id)}
          className="flex-1 px-3 py-1.5 bg-[#f0f5fa] text-[#18253d] text-sm font-semibold rounded-md hover:bg-[#e3edf6] transition border border-[#d9e6f1]"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete?.(id)}
          disabled={!canDelete}
          className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-md hover:bg-red-100 transition border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!canDelete ? 'Cannot delete the last tier' : 'Delete this tier'}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
